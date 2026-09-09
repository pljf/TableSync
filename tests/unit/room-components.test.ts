import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardEmptyState } from "@/components/rooms/dashboard-empty-state";
import { RoomNavigation } from "@/components/rooms/room-navigation";
import { GuestList } from "@/components/rooms/guest-list";
import { VetoReasons } from "@/components/menu/veto-reasons";
import type { EventType, Guest, MenuPlan, Vote } from "@/lib/domain";
import { EventFormatSelect } from "@/components/rooms/event-format-select";
import { PotluckContributions } from "@/components/menu/potluck-contributions";
import { EventPreparationNotes } from "@/components/menu/event-preparation-notes";

vi.mock("@/app/actions", () => ({ assignPotluckContributionAction: vi.fn(), setPotluckContributionReadyAction: vi.fn() }));
vi.mock("@/components/rooms/room-sync", () => ({ RoomSync: () => null }));
vi.mock("@/components/ui/mutation-form", () => ({ MutationForm: ({ children }: { children: ReactNode }) => createElement("form", null, children) }));

describe("room navigation and empty states", () => {
  it("offers a clear first-room action on an empty dashboard", () => {
    const html = renderToStaticMarkup(createElement(DashboardEmptyState));

    expect(html).toContain("No meal rooms yet");
    expect(html).toContain('href="/rooms/new"');
    expect(html).toContain("Create your first room");
  });

  it("marks the active room section and hides an unavailable public share", () => {
    const html = renderToStaticMarkup(
      createElement(RoomNavigation, { active: "plans", roomId: "room-1", shareAvailable: false })
    );

    expect(html).toMatch(/<a aria-current="page" aria-label="Plans" href="\/rooms\/room-1\/plans">/);
    expect(html).not.toContain("/share/room-1");
  });

  it("shows public sharing only when it is available", () => {
    const html = renderToStaticMarkup(
      createElement(RoomNavigation, { active: "overview", roomId: "room-1", shareAvailable: true })
    );

    expect(html).toContain('href="/share/room-1"');
  });

  it("offers a preferences return path only for the room's current guest", () => {
    const navigation = { active: "plans" as const, roomId: "room-1", shareAvailable: false };
    const guestHtml = renderToStaticMarkup(createElement(RoomNavigation, { ...navigation, guestCanViewPreferences: true }));
    const otherHtml = renderToStaticMarkup(createElement(RoomNavigation, navigation));
    expect(guestHtml).toContain('href="/preferences?roomId=room-1"');
    expect(guestHtml).toContain("My preferences");
    expect(otherHtml).not.toContain('href="/preferences?roomId=room-1"');
  });

  it("shows saved Veto reasons to the room without surfacing stale reasons on other vote types", () => {
    const votes = [
      { id: "veto-1", guestId: "guest-1", value: "VETO", reason: "The timing does not work." },
      { id: "like-1", guestId: "guest-2", value: "LIKE", reason: "Stale non-Veto reason" }
    ] as Vote[];
    const html = renderToStaticMarkup(createElement(VetoReasons, { guests: [{ id: "guest-1", name: "Maya" }], votes }));
    expect(html).toContain("The timing does not work.");
    expect(html).toContain("Maya:");
    expect(html).not.toContain("Stale non-Veto reason");
    expect(renderToStaticMarkup(createElement(VetoReasons, { votes: [] }))).toBe("");
  });

  it("lets hosts and the submitting guest review notes and keeps them out of other guests' views", () => {
    const guests = [{
      id: "guest-1", name: "Maya", canBring: true,
      preference: { dietType: "VEGETARIAN", allergies: ["peanut"], dislikes: ["mushroom"], likes: ["rice"], spiceLevel: "MILD", notes: "Please keep my serving aside." }
    }] as Guest[];
    const hostHtml = renderToStaticMarkup(createElement(GuestList, { guests, hostCanManage: true }));
    const selfHtml = renderToStaticMarkup(createElement(GuestList, { guests, hostCanManage: false, currentGuestId: "guest-1" }));
    const otherHtml = renderToStaticMarkup(createElement(GuestList, { guests, hostCanManage: false, currentGuestId: "guest-2" }));
    expect(hostHtml).toContain("Please keep my serving aside.");
    expect(hostHtml).toContain("mushroom");
    expect(selfHtml).toContain("Please keep my serving aside.");
    expect(otherHtml).not.toContain("Please keep my serving aside.");
    expect(otherHtml).toContain("Maya");
  });
});

describe("format selection and contribution access", () => {
  it.each([
    ["POTLUCK", "Bring each claimed dish"], ["BBQ", "separate utensils and cooking areas"],
    ["PICNIC", "chilled during transport"], ["BRUNCH", "savory dishes together with the fruit"],
    ["OTHER", "shared buffet with separate serving utensils"]
  ])("shows actionable preparation notes for %s", (eventType, expected) => {
    const html = renderToStaticMarkup(createElement(EventPreparationNotes, { eventType: eventType as EventType }));
    expect(html).toContain('<h3>Preparation notes</h3>');
    expect(html).toContain(expected);
    expect(html).toContain('<ul');
  });

  it.each(["DINNER", "HOTPOT"] as EventType[])("omits empty format preparation notes for %s", (eventType) => {
    expect(renderToStaticMarkup(createElement(EventPreparationNotes, { eventType }))).toBe("");
  });

  it.each(["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"] as EventType[])("describes the %s format and exposes seven choices", (value) => {
    const html = renderToStaticMarkup(createElement(EventFormatSelect, { value }));
    expect(html.match(/<option /g)).toHaveLength(7);
    expect(html).toContain(`value="${value}" selected=""`);
    expect(html).toContain("On the menu:");
    if (value === "OTHER") expect(html).toContain("shared buffet");
    if (value === "POTLUCK") expect(html).toContain("budget includes contributed dishes");
  });

  const guests = [
    { id: "owner", name: "Maya", canBring: true },
    { id: "other", name: "Sam", canBring: true },
    { id: "unavailable", name: "Lee", canBring: false }
  ] as Guest[];
  const plan: MenuPlan = {
    id: "plan-1", roomId: "room-1", title: "Shared Potluck", summary: "A contributed meal", score: 90,
    estimatedCostCents: 900, warnings: [], status: "FINALIZED", votes: [],
    createdAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:00:00Z",
    dishes: [{ id: "plan-dish-1", servings: 6, contributionGuestId: "owner", contributionReady: false, dish: {
      id: "dish-1", name: "Bean salad", category: "MAIN", baseServings: 4, estimatedCostCents: 600,
      cuisine: "Mediterranean", prepTimeMinutes: 15, spiceLevel: "NONE", spiceAdjustable: false,
      supportedEventTypes: ["POTLUCK"], tags: ["vegan", "shareable"],
      ingredients: [{ ingredient: { id: "bean", name: "White beans", category: "PRODUCE", defaultUnit: "g", tags: ["vegan"] }, quantity: 200, unit: "g" }]
    } }]
  };

  function renderContribution(guestId: string, isHost = false, owned = true, hasShopping = true) {
    const shownPlan = owned ? plan : { ...plan, dishes: plan.dishes.map((dish) => ({ ...dish, contributionGuestId: undefined })) };
    return renderToStaticMarkup(createElement(PotluckContributions, { plan: shownPlan, guests, guestId, isHost, hasShopping }));
  }

  it("shows the owner's scaled ingredients, readiness and confirmed release", () => {
    const html = renderContribution("owner");
    expect(html).toContain('data-contribution-dish-id="plan-dish-1"');
    expect(html).toContain("White beans");
    expect(html).toContain("300 g");
    expect(html).toContain("6 servings");
    expect(html).toContain("$9");
    expect(html).toContain("Release dish");
    expect(html).toContain('name="ready"');
    expect(html).toContain('name="confirmShoppingReset"');
  });

  it("keeps other guests out of an owned contribution's controls and recipe", () => {
    const html = renderContribution("other");
    expect(html).not.toContain("Release dish");
    expect(html).not.toContain("Claim dish");
    expect(html).not.toContain('name="ready"');
    expect(html).not.toContain("White beans");
  });

  it("offers claims only to guests who offered to bring food and confirms existing shopping reset", () => {
    expect(renderContribution("other", false, false)).toContain("Claim dish");
    expect(renderContribution("other", false, false)).toContain('name="confirmShoppingReset"');
    expect(renderContribution("other", false, false, false)).not.toContain('name="confirmShoppingReset"');
    expect(renderContribution("unavailable", false, false)).not.toContain("Claim dish");
  });

  it("lets the host assign only willing guests and manage contribution readiness", () => {
    const html = renderContribution("", true);
    expect(html).toContain("Assign contribution");
    expect(html).toContain('value="other"');
    expect(html).not.toContain('value="unavailable"');
    expect(html).toContain("Save readiness");
  });
});

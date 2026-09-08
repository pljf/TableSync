import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoomNextStep } from "@/components/rooms/room-next-step";
import type { DinnerRoom } from "@/lib/domain";

const room: DinnerRoom = {
  id: "room-1", hostId: "host-1", title: "Dinner", eventType: "DINNER", status: "COLLECTING_PREFERENCES",
  expectedGuests: 6, inviteToken: "test-invite", isPublicShareable: false, createdAt: "", updatedAt: ""
};
const defaults = { room, guestCount: 0, planCount: 0, isHost: true, isRoomGuest: false, shoppingCount: 0 };
type Props = Parameters<typeof RoomNextStep>[0];
function render(overrides: Partial<Props> = {}) {
  return renderToStaticMarkup(createElement(RoomNextStep, { ...defaults, ...overrides }));
}
function primary(html: string) {
  return Array.from(html.matchAll(/<a class="button" href="([^"]+)">([^<]+)<\/a>/g), ([, href, label]) => ({ href, label }));
}

describe("room next action", () => {
  it("starts an empty room at preferences with only one dominant action", () => {
    const html = render();
    expect(primary(html)).toEqual([{ href: "/join/test-invite", label: "Add my preferences" }]);
    expect(html).toContain('class="button secondary" href="#room-invite">Invite guests');
    expect(html).toContain("0 of 6 guests have responded.");
    expect(html).not.toContain("Review plans");
    expect(html).not.toContain("/shopping");
  });

  it("lets a host plan after a response without requiring all expected guests", () => {
    const html = render({ guestCount: 1 });
    expect(primary(html)).toEqual([{ href: "/rooms/room-1/plans", label: "Open menu planning" }]);
    expect(html).toContain('class="button secondary" href="/join/test-invite">Add my preferences');
    expect(html).toContain("1 of 6 guests have responded.");
  });

  it("keeps invitations secondary once a host has their own saved response", () => {
    const html = render({ guestCount: 1, isRoomGuest: true });
    expect(primary(html)).toHaveLength(1);
    expect(html).toContain('class="button secondary" href="#room-invite">Invite guests');
    expect(html).not.toContain("Add my preferences");
  });

  it("offers participants their own preferences while waiting for the host", () => {
    const html = render({ isHost: false, isRoomGuest: true, guestCount: 1 });
    expect(primary(html)).toEqual([{ href: "/preferences?roomId=room-1", label: "Edit my preferences" }]);
    expect(html).toContain("The host will generate menus");
    expect(html).not.toContain("test-invite");
    expect(html).not.toContain("Open menu planning");
  });

  it("directs failed generation to report recovery for hosts and preference review for guests", () => {
    const failedRoom = { ...room, status: "PLANNING" as const, generationReport: {} as NonNullable<DinnerRoom["generationReport"]> };
    expect(primary(render({ room: failedRoom, guestCount: 1 }))).toEqual([
      { href: "/rooms/room-1/plans#generation-report", label: "Review generation report" }
    ]);
    expect(primary(render({ room: failedRoom, guestCount: 1, isHost: false, isRoomGuest: true }))).toEqual([
      { href: "/preferences?roomId=room-1", label: "Edit my preferences" }
    ]);
  });

  it.each([[true, "Choose a menu"], [false, "Vote on menus"]] as const)("distinguishes host=%s during voting", (isHost, label) => {
    const html = render({ room: { ...room, status: "VOTING" }, guestCount: 2, planCount: 3, isHost, isRoomGuest: true });
    expect(primary(html)).toEqual([{ href: "/rooms/room-1/plans", label }]);
    expect(html).toContain("3 menu plans are open for voting.");
    expect(html).not.toContain("/preferences");
  });

  it("leads a finalized room to its shopping list", () => {
    const html = render({ room: { ...room, status: "FINALIZED" }, guestCount: 2, planCount: 3, finalPlanTitle: "Shared dinner", shoppingCount: 12 });
    expect(primary(html)).toEqual([{ href: "/rooms/room-1/shopping", label: "Open shopping" }]);
    expect(html).toContain("12-item shopping list");
    expect(html).toContain('class="button secondary" href="/rooms/room-1/plans">View finalized menu');
  });

  it("treats all-contributed Potluck as ready without requiring shared groceries", () => {
    const html = render({ room: { ...room, eventType: "POTLUCK", status: "FINALIZED" }, contributions: { totalDishes: 5, claimedDishes: 5 } });
    expect(primary(html)).toEqual([{ href: "/rooms/room-1/plans#potluck-contributions", label: "Manage dish contributions" }]);
    expect(html).toContain("no shared groceries are needed");
    expect(html).not.toContain("Add my preferences");
  });

  it.each(["DRAFT", "ARCHIVED"] as const)("does not offer unavailable mutations in %s rooms", (status) => {
    const html = render({ room: { ...room, status } });
    expect(primary(html)).toEqual([]);
    expect(html).not.toContain("/join/");
  });
});

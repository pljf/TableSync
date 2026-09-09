import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MenuComparison, summarizeMenuComparison } from "@/components/menu/menu-comparison";
import { MenuPlanReview } from "@/components/menu/menu-plan-review";
import type { Dish, MenuPlan, MenuPlanDish, Vote } from "@/lib/domain";

vi.mock("@/app/actions", () => ({ finalizePlanAction: vi.fn() }));
vi.mock("@/components/ui/mutation-form", () => ({ MutationForm: ({ children }: { children: ReactNode }) => createElement("form", { "data-finalize-form": true }, children) }));
vi.mock("@/components/menu/vote-form", () => ({ VoteForm: ({ planId }: { planId: string }) => createElement("form", { "data-vote-plan": planId }, "Save vote") }));

function dish(id: string, name: string, category: Dish["category"] = "MAIN", servings = 4): MenuPlanDish {
  return {
    servings,
    dish: { id, name, category, cuisine: "Mediterranean", baseServings: 4, estimatedCostCents: 1200,
      prepTimeMinutes: 20, spiceLevel: "MILD", spiceAdjustable: false, supportedEventTypes: ["DINNER", "POTLUCK"], tags: [], ingredients: [] }
  };
}

function plan(id: string, dishes: MenuPlanDish[], estimatedCostCents = 4000, votes: Vote[] = []): MenuPlan {
  return { id, roomId: "room-1", title: `Menu ${id}`, summary: "A complete meal", score: 90, dishes,
    estimatedCostCents, status: "PROPOSED", warnings: [], votes, createdAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:00:00Z" };
}

describe("menu comparison", () => {
  it("separates common dishes from actual dish and portion differences without changing the plans", () => {
    const rice = dish("rice", "Steamed rice", "SIDE");
    const first = plan("one", [rice, dish("beans", "White bean stew")]);
    const second = plan("two", [dish("lentils", "Lentil stew"), rice]);
    const before = JSON.stringify([first, second]);
    const comparison = summarizeMenuComparison([first, second], 6, "DINNER");
    expect(comparison.commonDishes.map(({ dish }) => dish.id)).toEqual(["rice"]);
    expect(comparison.options.map(({ differentDishes }) => differentDishes.map(({ dish }) => dish.id))).toEqual([["beans"], ["lentils"]]);
    expect(JSON.stringify([first, second])).toBe(before);

    const portions = summarizeMenuComparison([first, { ...first, id: "three", dishes: [rice, dish("beans", "White bean stew", "MAIN", 6)] }], 6, "DINNER");
    expect(portions.commonDishes.map(({ dish }) => dish.id)).toEqual(["rice"]);
    expect(portions.options.map(({ differentDishes }) => differentDishes[0].servings)).toEqual([4, 6]);
  });

  it("uses planned headcount for per-person estimates and keeps every vote type distinct", () => {
    const votes = [
      { id: "like", value: "LIKE" }, { id: "neutral", value: "NEUTRAL" }, { id: "veto", value: "VETO", reason: "Please check the timing." }
    ] as Vote[];
    const first = plan("one", [dish("beans", "Bean stew")], 4500, votes);
    const second = plan("two", [dish("rice", "Rice")], 3201);
    const comparison = summarizeMenuComparison([first, second], 8, "DINNER");
    expect(comparison.headcount).toBe(8);
    expect(comparison.options[0]).toMatchObject({ perPersonCents: 563, aboveLowestCents: 1299, likes: 1, neutral: 1, vetoes: 1 });
    expect(comparison.options[1]).toMatchObject({ perPersonCents: 400, aboveLowestCents: 0, likes: 0, neutral: 0, vetoes: 0 });
    expect(summarizeMenuComparison([first], 0, "DINNER").options[0].perPersonCents).toBe(4500);
  });

  it("links each comparison to its full menu and does not invent cost differences when estimates tie", () => {
    const menus = [plan("one", [dish("beans", "Bean stew")]), plan("two", [dish("rice", "Rice")])];
    const html = renderToStaticMarkup(createElement(MenuComparison, { plans: menus, eventType: "DINNER", plannedGuestCount: 5 }));
    expect(html).toContain("Estimates for 5 planned guests");
    expect(html).toContain('href="#menu-plan-one"');
    expect(html).toContain('href="#menu-plan-two"');
    expect(html).toContain("4 servings");
    expect(html).toContain("$8");
    expect(html).toContain("No votes yet");
    expect(html).not.toContain("Lowest estimate");
    expect(renderToStaticMarkup(createElement(MenuComparison, { plans: menus.slice(0, 1), eventType: "DINNER", plannedGuestCount: 5 }))).toBe("");
  });
});

describe("selected menu focus", () => {
  const menus = [plan("one", [dish("beans", "Bean stew")]), plan("two", [dish("rice", "Rice")])];
  const props = { plans: menus, eventType: "DINNER" as const, guests: [], plannedGuestCount: 6, canFinalize: true, canVote: true, votingOpen: true };

  it("keeps each menu and its voting and host choice controls available before finalization", () => {
    const html = renderToStaticMarkup(createElement(MenuPlanReview, props));
    expect(html).toContain("Compare menus");
    expect(html).toContain('aria-label="Generated menu plans"');
    expect(html.match(/data-finalize-form="true"/g)).toHaveLength(2);
    expect(html.match(/data-vote-plan=/g)).toHaveLength(2);
    expect(html).not.toContain("Other menu options (");
    expect(html).toContain('id="menu-plan-one"');
  });

  it("promotes the chosen menu, retains warnings, and closes alternatives with no mutation controls", () => {
    const finalized = [
      { ...menus[0], status: "REJECTED" as const },
      { ...menus[1], status: "FINALIZED" as const, warnings: [{ type: "SPICE_ADJUSTMENT" as const, message: "Keep the spicy sauce separate.", affectedGuestNames: [] }] }
    ];
    const html = renderToStaticMarkup(createElement(MenuPlanReview, { ...props, plans: finalized }));
    expect(html).toContain("Your selected menu");
    expect(html).toContain("Keep the spicy sauce separate.");
    expect(html.indexOf('id="menu-plan-two"')).toBeLessThan(html.indexOf('id="menu-plan-one"'));
    expect(html).toContain('<details class="card menu-alternatives"><summary>Other menu options (1)</summary>');
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
    expect(html).not.toContain("data-finalize-form");
    expect(html).not.toContain("data-vote-plan");
    expect(html).not.toContain("Compare menus");
    expect(html).toContain("Not selected");
  });

  it("keeps contribution guidance correct after a Potluck menu is finalized", () => {
    const html = renderToStaticMarkup(createElement(MenuPlanReview, { ...props, eventType: "POTLUCK", plans: [{ ...menus[0], status: "FINALIZED" }] }));
    expect(html).toContain("Manage whole-dish contributions below.");
    expect(html).not.toContain("Claim dishes after finalization");
    expect(html).not.toContain("Other menu options (");
  });
});

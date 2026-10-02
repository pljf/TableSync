import { describe, expect, it } from "vitest";
import type { GeneratedShoppingItem, Guest, MenuPlan } from "@/lib/domain";
import { assignShoppingItems } from "@/lib/shopping-engine/assign-items";
import { potluckContributionCosts, summarizeShoppingBudgets } from "@/lib/shopping-engine/budget-summary";
import { generateShoppingList } from "@/lib/shopping-engine/generate-shopping-list";
import { demoGuests, demoRoom, dishCatalog, ingredients } from "@/lib/seed-data";

function volunteer(id: string, maxBudgetCents?: number): Guest {
  return { ...demoGuests[0], id, name: id, canBring: true, preference: { ...demoGuests[0].preference, maxBudgetCents } };
}
function item(cost: number | undefined, id = "rice"): GeneratedShoppingItem {
  return { ingredient: ingredients[id], quantity: 1, unit: ingredients[id].defaultUnit, estimatedCostCents: cost };
}
function totals(items: GeneratedShoppingItem[], guests: Guest[], contributionCosts = {}) {
  return summarizeShoppingBudgets(items, guests.map((guest) => ({ ...guest, maxBudgetCents: guest.preference.maxBudgetCents })), contributionCosts);
}

describe("budget-aware automatic shopping assignment", () => {
  it("assigns an expensive item to a volunteer who can afford it", () => {
    const guests = [volunteer("a", 100), volunteer("b", 1000)];
    const assigned = assignShoppingItems([item(600, "chicken"), item(100)], guests);
    expect(assigned.map((entry) => entry.assignedToGuestId)).toEqual(["b", "a"]);
    expect(totals(assigned, guests).totals.every((row) => row.overByCents === 0)).toBe(true);
  });

  it("accepts the exact limit and respects a zero-dollar comfort", () => {
    const guests = [volunteer("a", 0), volunteer("b", 100)];
    const assigned = assignShoppingItems([item(100), item(1, "chicken")], guests);
    expect(assigned[0].assignedToGuestId).toBe("b");
    expect(assigned[1].assignedToGuestId).toBeUndefined();
    expect(totals(assigned, guests).budgetBlockedCount).toBe(1);
  });

  it("leaves groceries unassigned rather than exceeding everyone's comfort", () => {
    const guests = [volunteer("a", 200), volunteer("b", 200)];
    const assigned = assignShoppingItems([item(400, "chicken"), item(200)], guests);
    expect(assigned[0].assignedToGuestId).toBeUndefined();
    expect(totals(assigned, guests)).toMatchObject({ budgetBlockedCount: 1, unassignedCount: 1 });
  });

  it("retries constrained placement when balanced placement wastes capacity", () => {
    const guests = [volunteer("a", 800), volunteer("b", 500)];
    const assigned = assignShoppingItems([item(500, "chicken"), item(400), item(400, "fruit")], guests);
    expect(assigned.map((entry) => entry.assignedToGuestId)).toEqual(["b", "a", "a"]);
    expect(totals(assigned, guests).totals.every((row) => row.overByCents === 0)).toBe(true);
  });

  it("keeps unknown costs for review and excludes non-volunteers", () => {
    const guests = [volunteer("a", 100), { ...volunteer("b"), canBring: false }];
    const assigned = assignShoppingItems([item(undefined), item(200, "chicken")], guests);
    expect(assigned.every((entry) => entry.assignedToGuestId === undefined)).toBe(true);
    expect(totals(assigned, guests)).toMatchObject({ budgetBlockedCount: 1, unpricedCount: 1 });
  });

  it("allows volunteers without a stated limit to cover the remainder", () => {
    const guests = [volunteer("a", 100), volunteer("b")];
    const assigned = assignShoppingItems([item(2000, "chicken"), item(100)], guests);
    expect(assigned.map((entry) => entry.assignedToGuestId)).toEqual(["b", "a"]);
  });

  it("preserves input, order and deterministic assignments across guest order", () => {
    const guests = [volunteer("a", 100), volunteer("b", 1000)];
    const items = [item(100), item(600, "chicken")];
    const before = structuredClone({ items, guests });
    expect(assignShoppingItems(items, guests)).toEqual(assignShoppingItems(items, [...guests].reverse()));
    expect(assignShoppingItems(items, guests).map((entry) => entry.ingredient.id)).toEqual(["rice", "chicken"]);
    expect({ items, guests }).toEqual(before);
  });

  it("reserves scaled Potluck contributions before taking shared groceries", () => {
    const chicken = dishCatalog.find((dish) => dish.id === "chicken-taco-bowl")!;
    const rice = dishCatalog.find((dish) => dish.id === "steamed-rice")!;
    const contributionCost = Math.round(chicken.estimatedCostCents * 6 / chicken.baseServings);
    const plan = { dishes: [{ dish: chicken, servings: 6, contributionGuestId: "a" }, { dish: rice, servings: 4 }] } as MenuPlan;
    const guests = [volunteer("a", contributionCost), volunteer("b", rice.estimatedCostCents)];
    const room = { ...demoRoom, eventType: "POTLUCK" as const };
    const assigned = generateShoppingList({ room, guests, plan });
    expect(potluckContributionCosts(room, plan)).toEqual({ a: contributionCost });
    expect(assigned.every((entry) => entry.assignedToGuestId === "b")).toBe(true);
    expect(totals(assigned, guests, potluckContributionCosts(room, plan)).totals.every((row) => row.overByCents === 0)).toBe(true);
    expect(potluckContributionCosts(demoRoom, plan)).toEqual({});
  });

  it("reports manual or retained overspending and incomplete estimates honestly", () => {
    const guests = [volunteer("a", 500)];
    const assigned = [ { ...item(400), assignedToGuestId: "a" }, { ...item(undefined, "fruit"), assignedToGuestId: "a" } ];
    expect(totals(assigned, guests, { a: 300 }).totals[0]).toMatchObject({ total: 700, overByCents: 200, unknownCount: 1 });
    expect(totals([], guests, { a: 700 }).totals[0]).toMatchObject({ total: 700, overByCents: 200 });
  });
});

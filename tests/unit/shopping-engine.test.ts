import { describe, expect, it } from "vitest";
import type { MenuPlan } from "@/lib/domain";
import { assignShoppingItems } from "@/lib/shopping-engine/assign-items";
import { generateShoppingList } from "@/lib/shopping-engine/generate-shopping-list";
import { demoGuests, demoRoom, dishCatalog, ingredients } from "@/lib/seed-data";

function dish(id: string) {
  const match = dishCatalog.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing test dish ${id}`);
  }
  return match;
}

function testPlan(): MenuPlan {
  return {
    id: "plan-test",
    roomId: demoRoom.id,
    title: "Rice merge plan",
    summary: "A plan with rice in multiple dishes.",
    score: 80,
    estimatedCostCents: 5000,
    status: "FINALIZED",
    warnings: [],
    dishes: [
      { dish: dish("chicken-taco-bowl"), servings: 6 },
      { dish: dish("steamed-rice"), servings: 6 },
      { dish: dish("fruit-platter"), servings: 6 },
      { dish: dish("lemonade"), servings: 6 }
    ],
    votes: [],
    createdAt: demoRoom.createdAt,
    updatedAt: demoRoom.updatedAt
  };
}

describe("shopping engine", () => {
  it("excludes whole claimed Potluck dishes before merging shared ingredients and preserves their menu cost", () => {
    const plan = testPlan();
    plan.dishes[0].contributionGuestId = demoGuests[0].id;
    const potluck = { ...demoRoom, eventType: "POTLUCK" as const };
    const before = structuredClone(plan);
    const items = generateShoppingList({ room: potluck, guests: demoGuests, plan });
    const remaining = generateShoppingList({ room: potluck, guests: demoGuests, plan: { ...plan, dishes: plan.dishes.slice(1) } });
    expect(items).toEqual(remaining);
    expect(items.find((item) => item.ingredient.id === "rice")?.quantity).toBe(4.5);
    const expectedSharedCost = plan.dishes.slice(1).reduce((sum, item) =>
      sum + Math.round(item.dish.estimatedCostCents * item.servings / item.dish.baseServings), 0);
    expect(items.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0)).toBe(expectedSharedCost);
    expect(plan).toEqual(before);
  });

  it("does not treat dish contributions as free food in Dinner or Hotpot shopping", () => {
    const plan = testPlan();
    const original = structuredClone(plan);
    plan.dishes.forEach((item) => { item.contributionGuestId = demoGuests[0].id; });
    for (const eventType of ["DINNER", "HOTPOT"] as const) {
      expect(generateShoppingList({ room: { ...demoRoom, eventType }, guests: demoGuests, plan }))
        .toEqual(generateShoppingList({ room: { ...demoRoom, eventType }, guests: demoGuests, plan: original }));
    }
  });

  it("needs no shared groceries when every Potluck dish is claimed, regardless of readiness", () => {
    const plan = testPlan();
    plan.dishes.forEach((item, index) => {
      item.contributionGuestId = demoGuests[0].id;
      item.contributionReady = index % 2 === 0;
    });
    expect(generateShoppingList({ room: { ...demoRoom, eventType: "POTLUCK" }, guests: demoGuests, plan })).toEqual([]);
  });

  it("scales and merges identical ingredients by unit", () => {
    const items = generateShoppingList({ room: demoRoom, guests: demoGuests, plan: testPlan() });
    const rice = items.find((item) => item.ingredient.id === "rice");

    expect(rice).toBeDefined();
    expect(rice?.quantity).toBeGreaterThan(6);
  });

  it("groups generated items with estimated cost", () => {
    const items = generateShoppingList({ room: demoRoom, guests: demoGuests, plan: testPlan() });

    expect(items.every((item) => item.estimatedCostCents && item.estimatedCostCents > 0)).toBe(true);
    expect(new Set(items.map((item) => item.ingredient.category)).size).toBeGreaterThan(1);
  });

  it("assigns only guests who can bring items", () => {
    const items = generateShoppingList({ room: demoRoom, guests: demoGuests, plan: testPlan() });
    const eligibleGuestIds = new Set(demoGuests.filter((guest) => guest.canBring).map((guest) => guest.id));

    expect(items.every((item) => item.assignedToGuestId && eligibleGuestIds.has(item.assignedToGuestId))).toBe(true);
  });

  it("balances expensive items greedily across eligible guests", () => {
    const assigned = assignShoppingItems(
      [
        { ingredient: ingredients.rice, quantity: 1, unit: "bag", estimatedCostCents: 2000 },
        { ingredient: ingredients["black-beans"], quantity: 1, unit: "case", estimatedCostCents: 1800 },
        { ingredient: ingredients.lemonade, quantity: 1, unit: "case", estimatedCostCents: 1200 }
      ],
      demoGuests
    );

    expect(new Set(assigned.map((item) => item.assignedToGuestId)).size).toBeGreaterThan(1);
  });

  it("keeps the displayed category and ingredient ordering after cost-balanced assignment", () => {
    const items = generateShoppingList({ room: demoRoom, guests: demoGuests, plan: testPlan() });
    const keys = items.map((item) => `${item.ingredient.category}:${item.ingredient.name}`);

    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
  });

  it("does not double-scale cost when actual attendance exceeds the original estimate", () => {
    const plan = testPlan();
    const items = generateShoppingList({
      room: { ...demoRoom, expectedGuests: 2 },
      guests: demoGuests,
      plan
    });
    const expectedDishCost = plan.dishes.reduce(
      (sum, item) => sum + Math.round(item.dish.estimatedCostCents * (item.servings / item.dish.baseServings)),
      0
    );
    const shoppingCost = items.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0);
    expect(shoppingCost).toBe(expectedDishCost);
  });

  it("rounds merged quantities once after combining fractional ingredient portions", () => {
    const riceDish = dish("steamed-rice");
    const plan = { ...testPlan(), dishes: Array.from({ length: 3 }, (_, index) => ({
      dish: { ...riceDish, id: `rice-${index}`, ingredients: [{ ingredient: ingredients.rice, quantity: 0.05, unit: "cup" }] },
      servings: 1
    })) };
    const rice = generateShoppingList({ room: demoRoom, guests: [], plan }).find((item) => item.ingredient.id === "rice");
    expect(rice?.quantity).toBe(0.04);
  });

  it("does not merge the same ingredient when the purchase units differ", () => {
    const riceDish = dish("steamed-rice");
    const riceIngredient = riceDish.ingredients.find((item) => item.ingredient.id === "rice");
    expect(riceIngredient).toBeDefined();
    if (!riceIngredient) {
      return;
    }
    const plan = {
      ...testPlan(),
      dishes: [
        {
          dish: { ...riceDish, id: "rice-by-bag", ingredients: [{ ...riceIngredient, unit: "bag" }] },
          servings: 4
        },
        {
          dish: { ...riceDish, id: "rice-by-cup", ingredients: [{ ...riceIngredient, unit: "cup" }] },
          servings: 4
        }
      ]
    };

    const riceItems = generateShoppingList({ room: demoRoom, guests: demoGuests, plan }).filter(
      (item) => item.ingredient.id === "rice"
    );
    expect(riceItems.map((item) => item.unit)).toEqual(["bag", "cup"]);
  });

  it("leaves every item unassigned when nobody opted in to bring groceries", () => {
    const guests = demoGuests.map((guest) => ({ ...guest, canBring: false }));
    const items = generateShoppingList({ room: demoRoom, guests, plan: testPlan() });

    expect(items.every((item) => item.assignedToGuestId === undefined)).toBe(true);
  });
});


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
});


import { describe, expect, it } from "vitest";
import { allocateIngredientCosts, ingredientCostWeight } from "@/lib/shopping-engine/ingredient-costs";
import { dishCatalog, ingredients } from "@/lib/seed-data";

const chickenDish = dishCatalog.find((dish) => dish.id === "roast-chicken") ?? dishCatalog.find((dish) => dish.ingredients.some((item) => item.ingredient.id === "chicken"))!;

describe("ingredient recipe cost allocation", () => {
  it("covers every catalog ingredient quantity and unit", () => {
    for (const dish of dishCatalog) {
      for (const item of dish.ingredients) expect(ingredientCostWeight(item), `${dish.id}: ${item.ingredient.id} ${item.unit}`).toBeGreaterThan(0);
      for (const servings of [1, 3, 6, 9]) {
        const costs = allocateIngredientCosts(dish, servings);
        expect(costs.every((cost) => Number.isInteger(cost) && cost >= 0)).toBe(true);
        expect(costs.reduce((sum, cost) => sum + cost, 0)).toBe(Math.round(dish.estimatedCostCents * servings / dish.baseServings));
      }
    }
  });

  it("gives two pounds of chicken a larger share than two tablespoons of oil", () => {
    const dish = { ...chickenDish, baseServings: 4, estimatedCostCents: 1000, ingredients: [
      { ingredient: ingredients.chicken, quantity: 2, unit: "lb" },
      { ingredient: ingredients["olive-oil"], quantity: 2, unit: "tbsp" }
    ] };
    expect(allocateIngredientCosts(dish, 4)).toEqual([941, 59]);
    expect(allocateIngredientCosts(dish, 6)).toEqual([1412, 88]);
  });

  it("converts compatible units while refusing guessed package sizes", () => {
    expect(ingredientCostWeight({ ingredient: ingredients.chicken, quantity: 16, unit: "oz" })).toBeCloseTo(400);
    expect(ingredientCostWeight({ ingredient: ingredients["olive-oil"], quantity: 6, unit: "tsp" })).toBe(50);
    expect(ingredientCostWeight({ ingredient: ingredients.chicken, quantity: 1, unit: "bag" })).toBeUndefined();
    expect(ingredientCostWeight({ ingredient: ingredients.chicken, quantity: 1, unit: "cup" })).toBeUndefined();
    expect(ingredientCostWeight({ ingredient: ingredients.chicken, quantity: 1, unit: "constructor" })).toBeUndefined();
    expect(ingredientCostWeight({ ingredient: { ...ingredients.chicken, id: "__proto__" }, quantity: 1, unit: "lb" })).toBeUndefined();
  });

  it("retains a cent-exact equal-share fallback for unsupported recipes", () => {
    const dish = { ...chickenDish, baseServings: 4, estimatedCostCents: 1001, ingredients: [
      { ingredient: ingredients.chicken, quantity: 2, unit: "bag" },
      { ingredient: ingredients["olive-oil"], quantity: 2, unit: "tbsp" }
    ] };
    expect(allocateIngredientCosts(dish, 4)).toEqual([501, 500]);
    expect(allocateIngredientCosts({ ...dish, estimatedCostCents: 0 }, 4)).toEqual([0, 0]);
    expect(allocateIngredientCosts({ ...dish, ingredients: [] }, 4)).toEqual([]);
  });
});

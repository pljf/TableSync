import type { GeneratedShoppingItem, GenerateShoppingInput, Ingredient } from "@/lib/domain";
import { assignShoppingItems } from "@/lib/shopping-engine/assign-items";

type MergeRecord = {
  ingredient: Ingredient;
  quantity: number;
  unit: string;
  estimatedCostCents: number;
};

export function generateShoppingList(input: GenerateShoppingInput): GeneratedShoppingItem[] {
  const { guests, plan } = input;
  const merged = new Map<string, MergeRecord>();

  for (const planDish of plan.dishes) {
    const scale = planDish.servings / planDish.dish.baseServings;
    const scaledDishCost = Math.round(planDish.dish.estimatedCostCents * (planDish.servings / planDish.dish.baseServings));
    const ingredientCost = Math.max(1, Math.round(scaledDishCost / Math.max(planDish.dish.ingredients.length, 1)));

    for (const dishIngredient of planDish.dish.ingredients) {
      const key = `${dishIngredient.ingredient.id}:${dishIngredient.unit}`;
      const previous = merged.get(key);
      const scaledQuantity = Number((dishIngredient.quantity * scale).toFixed(2));

      if (previous) {
        previous.quantity = Number((previous.quantity + scaledQuantity).toFixed(2));
        previous.estimatedCostCents += ingredientCost;
        continue;
      }

      merged.set(key, {
        ingredient: dishIngredient.ingredient,
        quantity: scaledQuantity,
        unit: dishIngredient.unit,
        estimatedCostCents: ingredientCost
      });
    }
  }

  const items = [...merged.values()]
    .map<GeneratedShoppingItem>((item) => ({
      ...item
    }))
    .sort((a, b) => {
      const category = a.ingredient.category.localeCompare(b.ingredient.category);
      return category === 0 ? a.ingredient.name.localeCompare(b.ingredient.name) : category;
    });

  return assignShoppingItems(items, guests);
}


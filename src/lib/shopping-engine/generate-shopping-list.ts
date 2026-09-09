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
    // A Potluck owner brings this entire recipe at the finalized serving count.
    // Its cost remains in the menu budget, but its ingredients must not also
    // appear in the shared groceries (even when other dishes use them).
    if (input.room.eventType === "POTLUCK" && planDish.contributionGuestId) continue;
    const scale = planDish.servings / planDish.dish.baseServings;
    const scaledDishCost = Math.round(planDish.dish.estimatedCostCents * (planDish.servings / planDish.dish.baseServings));
    const ingredientCount = planDish.dish.ingredients.length;
    const ingredientCost = Math.floor(scaledDishCost / Math.max(ingredientCount, 1));
    const remainingCents = scaledDishCost % Math.max(ingredientCount, 1);

    for (const [index, dishIngredient] of planDish.dish.ingredients.entries()) {
      const key = `${dishIngredient.ingredient.id}:${dishIngredient.unit}`;
      const previous = merged.get(key);
      const scaledQuantity = dishIngredient.quantity * scale;
      const allocatedCost = ingredientCost + (index < remainingCents ? 1 : 0);

      if (previous) {
        previous.quantity += scaledQuantity;
        previous.estimatedCostCents += allocatedCost;
        continue;
      }

      merged.set(key, {
        ingredient: dishIngredient.ingredient,
        quantity: scaledQuantity,
        unit: dishIngredient.unit,
        estimatedCostCents: allocatedCost
      });
    }
  }

  const items = [...merged.values()]
    .map<GeneratedShoppingItem>((item) => ({
      ...item,
      quantity: Number(item.quantity.toFixed(2))
    }))
    .sort((a, b) => {
      const category = a.ingredient.category.localeCompare(b.ingredient.category);
      return category || a.ingredient.name.localeCompare(b.ingredient.name) || a.ingredient.id.localeCompare(b.ingredient.id) || a.unit.localeCompare(b.unit);
    });

  return assignShoppingItems(items, guests);
}


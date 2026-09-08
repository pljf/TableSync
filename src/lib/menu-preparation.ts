import type { MenuPlanDish } from "@/lib/domain";

/** Use the finalized portions, never a new headcount or contribution quantity. */
export function preparationIngredients({ dish, servings }: MenuPlanDish) {
  const scale = servings / dish.baseServings;
  return dish.ingredients.map(({ ingredient, quantity, unit }) => ({
    ingredient,
    quantity: Number((quantity * scale).toFixed(2)),
    unit
  }));
}

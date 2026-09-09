import type { DinnerRoom, Dish, Guest } from "@/lib/domain";
import { dishMatchesTerms, evaluateDishConstraints } from "@/lib/menu-engine/constraints";

export type DishScore = {
  dish: Dish;
  score: number;
  likesMatched: number;
  dislikesMatched: number;
  reasons: string[];
};

export function scoreDish(dish: Dish, guests: Guest[], room: DinnerRoom): DishScore {
  const constraint = evaluateDishConstraints(dish, guests);
  const likesMatched = guests.reduce((sum, guest) => sum + dishMatchesTerms(dish, guest.preference.likes).length, 0);
  const dislikesMatched = guests.reduce((sum, guest) => sum + dishMatchesTerms(dish, guest.preference.dislikes).length, 0);
  const estimatedGuestCount = Math.max(room.expectedGuests ?? guests.length, guests.length, 1);
  const scaledCost = Math.round(dish.estimatedCostCents * (estimatedGuestCount / dish.baseServings));
  const budgetTarget = room.totalBudgetCents ? room.totalBudgetCents * 0.35 : 4500;
  const costPenalty = Math.max(0, Math.round((scaledCost - budgetTarget) / 300));
  const prepTimePenalty = Math.max(0, Math.round((dish.prepTimeMinutes - 35) / 5));
  const dietCompatibilityBonus = dish.tags.includes("vegan") || dish.tags.includes("gluten-free") ? 8 : 0;

  const score =
    50 +
    likesMatched * 10 +
    dietCompatibilityBonus -
    dislikesMatched * 8 -
    constraint.spicePenalty -
    costPenalty -
    prepTimePenalty;

  const reasons = [
    likesMatched > 0 ? `${likesMatched} preference match${likesMatched === 1 ? "" : "es"}` : "",
    dislikesMatched > 0 ? `${dislikesMatched} dislike match${dislikesMatched === 1 ? "" : "es"}` : "",
    constraint.spicePenalty > 0 ? "minor spice penalty" : "",
    dietCompatibilityBonus > 0 ? "broad diet compatibility" : ""
  ].filter(Boolean);

  return {
    dish,
    score: Math.max(0, score),
    likesMatched,
    dislikesMatched,
    reasons
  };
}


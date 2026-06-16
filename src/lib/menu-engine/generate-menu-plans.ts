import type { DinnerRoom, Dish, GeneratedPlan, Guest, MenuPlanDish, PlanWarning } from "@/lib/domain";
import { evaluateDishConstraints } from "@/lib/menu-engine/constraints";
import { scoreDish } from "@/lib/menu-engine/score-dish";

type Candidate = GeneratedPlan & {
  key: string;
};

function scaledCost(dish: Dish, servings: number): number {
  return Math.round(dish.estimatedCostCents * (servings / dish.baseServings));
}

function servingsForDish(dish: Dish, guestCount: number, mainCount: number): number {
  if (dish.category === "MAIN") {
    return Math.max(2, Math.ceil(guestCount / mainCount));
  }

  if (dish.category === "DRINK" || dish.category === "DESSERT") {
    return guestCount;
  }

  return Math.max(guestCount, 4);
}

function titleFor(dishes: Dish[]): string {
  const main = dishes.find((dish) => dish.category === "MAIN");
  const cuisine = main?.cuisine ?? "Group";
  const style = dishes.some((dish) => dish.tags.includes("hotpot")) ? "Hotpot" : "Dinner";
  return `${cuisine} ${style} Plan`;
}

function warningsForPlan(room: DinnerRoom, guests: Guest[], dishes: Dish[], estimatedCostCents: number): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const budget = room.totalBudgetCents;

  if (budget && estimatedCostCents > budget) {
    warnings.push({
      type: "BUDGET_TOO_LOW",
      message: `Estimated cost is above the room budget by $${((estimatedCostCents - budget) / 100).toFixed(0)}.`,
      affectedGuestNames: guests.map((guest) => guest.name)
    });
  }

  const dessert = dishes.some((dish) => dish.category === "DESSERT");
  if (!dessert) {
    warnings.push({
      type: "LOW_VARIETY",
      message: "No dessert was included because the safe catalog options were limited.",
      affectedGuestNames: []
    });
  }

  return warnings;
}

function scorePlan(room: DinnerRoom, guests: Guest[], dishes: Dish[], estimatedCostCents: number): number {
  const averageDishScore = dishes.reduce((sum, dish) => sum + scoreDish(dish, guests, room).score, 0) / dishes.length;
  const categories = new Set(dishes.map((dish) => dish.category));
  const categoryBalanceBonus = categories.has("MAIN") && categories.has("SIDE") && categories.has("DRINK") ? 12 : 0;
  const dessertBonus = categories.has("DESSERT") ? 4 : 0;
  const likedGuests = guests.filter((guest) => dishes.some((dish) => scoreDish(dish, [guest], room).likesMatched > 0)).length;
  const coverageBonus = likedGuests * 4;
  const budget = room.totalBudgetCents;
  const budgetPenalty = budget ? Math.max(0, Math.round((estimatedCostCents - budget) / 250)) : 0;

  return Math.round(averageDishScore + categoryBalanceBonus + dessertBonus + coverageBonus - budgetPenalty);
}

export function generateMenuPlans(input: { room: DinnerRoom; guests: Guest[]; dishes: Dish[] }): GeneratedPlan[] {
  const { room, guests, dishes } = input;
  const safeDishes = dishes.filter((dish) => evaluateDishConstraints(dish, guests).allowed);
  const scored = safeDishes
    .map((dish) => scoreDish(dish, guests, room))
    .sort((a, b) => b.score - a.score);

  const byCategory = (category: Dish["category"], limit: number) =>
    scored
      .filter(({ dish }) => dish.category === category)
      .slice(0, limit)
      .map(({ dish }) => dish);

  const mains = byCategory("MAIN", 8);
  const sides = byCategory("SIDE", 8);
  const appetizers = byCategory("APPETIZER", 4);
  const desserts = byCategory("DESSERT", 5);
  const drinks = byCategory("DRINK", 4);
  const guestCount = Math.max(room.expectedGuests ?? guests.length, guests.length, 1);
  const candidates: Candidate[] = [];

  for (const main of mains) {
    for (const side of sides.slice(0, 5)) {
      for (const drink of drinks.slice(0, 3)) {
        const dessertPool = desserts.length > 0 ? desserts.slice(0, 4) : [undefined];
        for (const dessert of dessertPool) {
          const app = appetizers.find((item) => item.cuisine === main.cuisine) ?? appetizers[0];
          const dishesForPlan = [main, side, app, dessert, drink].filter(Boolean) as Dish[];
          const mainCount = dishesForPlan.filter((dish) => dish.category === "MAIN").length;
          const planDishes: MenuPlanDish[] = dishesForPlan.map((dish) => ({
            dish,
            servings: servingsForDish(dish, guestCount, mainCount)
          }));
          const estimatedCostCents = planDishes.reduce((sum, item) => sum + scaledCost(item.dish, item.servings), 0);
          const budgetLimit = room.totalBudgetCents ? room.totalBudgetCents * 1.2 : Number.POSITIVE_INFINITY;

          if (estimatedCostCents > budgetLimit) {
            continue;
          }

          const key = dishesForPlan
            .map((dish) => dish.id)
            .sort()
            .join("|");

          candidates.push({
            key,
            title: titleFor(dishesForPlan),
            summary: `Balances ${main.name.toLowerCase()} with ${side.name.toLowerCase()} and shared add-ons.`,
            score: scorePlan(room, guests, dishesForPlan, estimatedCostCents),
            estimatedCostCents,
            warnings: warningsForPlan(room, guests, dishesForPlan, estimatedCostCents),
            dishes: planDishes
          });
        }
      }
    }
  }

  const unique = new Map<string, Candidate>();
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (!unique.has(candidate.key)) {
      unique.set(candidate.key, candidate);
    }
    if (unique.size >= 3) {
      break;
    }
  }

  if (unique.size === 0) {
    return [
      {
        title: "Needs More Inputs",
        summary: "No safe plan could be generated from the current catalog and constraints.",
        score: 0,
        estimatedCostCents: 0,
        warnings: [
          {
            type: "LOW_VARIETY",
            message: "Every candidate dish conflicted with at least one allergy, diet, spice tolerance, or budget constraint.",
            affectedGuestNames: guests.map((guest) => guest.name)
          }
        ],
        dishes: []
      }
    ];
  }

  return [...unique.values()].map((candidate) => ({
    title: candidate.title,
    summary: candidate.summary,
    score: candidate.score,
    estimatedCostCents: candidate.estimatedCostCents,
    warnings: candidate.warnings,
    dishes: candidate.dishes
  }));
}

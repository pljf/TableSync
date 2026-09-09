import type { DishCategory, EventType, HotpotRole, MenuPlanDish } from "@/lib/domain";
import { humanize } from "@/lib/format";

type PresentableDish = {
  category: DishCategory;
  hotpotRole?: HotpotRole;
  name: string;
};

const hotpotRoleOrder: Record<HotpotRole, number> = {
  BROTH: 0,
  PROTEIN: 1,
  VEGETABLE: 2,
  STAPLE: 3,
  SAUCE: 4,
  DRINK: 5
};

const dinnerCategoryOrder: Record<DishCategory, number> = {
  MAIN: 0,
  SIDE: 1,
  APPETIZER: 2,
  DESSERT: 3,
  SAUCE: 4,
  DRINK: 5
};

export function compareMenuDishes(left: PresentableDish, right: PresentableDish, eventType: EventType | boolean = "DINNER"): number {
  const isHotpot = eventType === true || eventType === "HOTPOT";
  const leftOrder = isHotpot && left.hotpotRole ? hotpotRoleOrder[left.hotpotRole] : dinnerCategoryOrder[left.category];
  const rightOrder = isHotpot && right.hotpotRole ? hotpotRoleOrder[right.hotpotRole] : dinnerCategoryOrder[right.category];

  return leftOrder - rightOrder || left.name.localeCompare(right.name);
}

export function menuDishRole(dish: PresentableDish, eventType: EventType): string {
  if (eventType === "HOTPOT") return humanize(dish.hotpotRole ?? dish.category);
  if (dish.category === "MAIN") {
    return { DINNER: "Main", POTLUCK: "Shared main", BBQ: "Grill main", PICNIC: "Portable main", BRUNCH: "Brunch main", OTHER: "Buffet main" }[eventType];
  }
  if (dish.category === "SAUCE" && eventType === "BBQ") return "Accompaniment";
  if (dish.category === "SIDE" && eventType === "PICNIC") return "Portable side";
  return humanize(dish.category);
}

export function contributionCostCents({ dish, servings }: MenuPlanDish): number {
  return Math.round(dish.estimatedCostCents * servings / dish.baseServings);
}

export function contributionSummary(dishes: MenuPlanDish[]) {
  const contributed = dishes.filter((dish) => dish.contributionGuestId);
  return {
    claimedDishes: contributed.length,
    readyDishes: contributed.filter((dish) => dish.contributionReady).length,
    totalDishes: dishes.length,
    contributedCostCents: contributed.reduce((sum, dish) => sum + contributionCostCents(dish), 0)
  };
}

export function formatServings(servings: number): string {
  return `${servings} ${servings === 1 ? "serving" : "servings"}`;
}

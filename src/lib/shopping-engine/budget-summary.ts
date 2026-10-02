import type { DinnerRoom, Guest, MenuPlan, ShoppingItem } from "@/lib/domain";

export type ShoppingBudgetGuest = Pick<Guest, "id" | "name" | "canBring"> & { maxBudgetCents?: number };

/** A contributor spends this recipe estimate before taking shared groceries. */
export function potluckContributionCosts(room: Pick<DinnerRoom, "eventType">, plan?: Pick<MenuPlan, "dishes">): Record<string, number> {
  const costs = new Map<string, number>();
  if (room.eventType === "POTLUCK") {
    for (const item of plan?.dishes ?? []) {
      if (!item.contributionGuestId) continue;
      const cost = Math.round(item.dish.estimatedCostCents * item.servings / item.dish.baseServings);
      costs.set(item.contributionGuestId, (costs.get(item.contributionGuestId) ?? 0) + cost);
    }
  }
  return Object.fromEntries(costs);
}

export function summarizeShoppingBudgets(
  items: Pick<ShoppingItem, "assignedToGuestId" | "estimatedCostCents">[],
  guests: ShoppingBudgetGuest[],
  contributionCosts: Readonly<Record<string, number>> = {}
) {
  const totals = guests.map((guest) => {
    const groceries = items.filter((item) => item.assignedToGuestId === guest.id);
    const contributionCostCents = Object.hasOwn(contributionCosts, guest.id) ? contributionCosts[guest.id] : 0;
    const total = groceries.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), contributionCostCents);
    return { guest, total, contributionCostCents, unknownCount: groceries.filter((item) => item.estimatedCostCents === undefined).length,
      overByCents: guest.maxBudgetCents === undefined ? 0 : Math.max(total - guest.maxBudgetCents, 0) };
  });
  const volunteers = totals.filter(({ guest }) => guest.canBring);
  const unassigned = items.filter((item) => !item.assignedToGuestId);
  const budgetBlocked = unassigned.filter((item) => item.estimatedCostCents !== undefined && volunteers.length > 0 &&
    volunteers.every(({ guest, total }) => guest.maxBudgetCents !== undefined && total + item.estimatedCostCents! > guest.maxBudgetCents));
  return { totals, volunteerCount: volunteers.length, unassignedCount: unassigned.length, budgetBlockedCount: budgetBlocked.length,
    unpricedCount: unassigned.filter((item) => item.estimatedCostCents === undefined).length };
}

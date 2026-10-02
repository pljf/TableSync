import type { GeneratedShoppingItem, Guest } from "@/lib/domain";

export function assignShoppingItems(
  items: GeneratedShoppingItem[],
  guests: Guest[],
  initialCosts: Readonly<Record<string, number>> = {}
): GeneratedShoppingItem[] {
  const eligibleGuests = guests.filter((guest) => guest.canBring);
  const sortedItems = items.map((item, index) => ({ item, index })).sort((a, b) =>
    (b.item.estimatedCostCents ?? 0) - (a.item.estimatedCostCents ?? 0) ||
    a.item.ingredient.id.localeCompare(b.item.ingredient.id) || a.item.unit.localeCompare(b.item.unit));

  function allocate(constrainedFirst: boolean) {
    const assignedCost = new Map(eligibleGuests.map((guest) => [guest.id,
      Object.hasOwn(initialCosts, guest.id) ? initialCosts[guest.id] : 0]));
    const assignments = new Map<number, string>();
    let assignedCents = 0;
    for (const { item, index } of sortedItems) {
      const cost = item.estimatedCostCents;
      // An unknown cost cannot be checked against a guest's budget comfort.
      if (cost === undefined || !Number.isFinite(cost) || cost < 0) continue;
      const candidates = eligibleGuests.filter((guest) => guest.preference.maxBudgetCents === undefined ||
        (assignedCost.get(guest.id) ?? 0) + cost <= guest.preference.maxBudgetCents);
      candidates.sort((a, b) => {
        if (constrainedFirst) {
          const remainingA = (a.preference.maxBudgetCents ?? Infinity) - (assignedCost.get(a.id) ?? 0);
          const remainingB = (b.preference.maxBudgetCents ?? Infinity) - (assignedCost.get(b.id) ?? 0);
          if (remainingA !== remainingB) return remainingA - remainingB;
        }
        return (assignedCost.get(a.id) ?? 0) - (assignedCost.get(b.id) ?? 0) || a.id.localeCompare(b.id);
      });
      const assignee = candidates[0];
      if (!assignee) continue;
      assignedCost.set(assignee.id, (assignedCost.get(assignee.id) ?? 0) + cost);
      assignments.set(index, assignee.id);
      assignedCents += cost;
    }
    return { assignments, assignedCents };
  }

  // Keep cost balance when it fits. A constrained-first retry can fit more
  // items when cost balancing consumes capacity needed by a later item.
  let result = allocate(false);
  if (result.assignments.size < items.length && eligibleGuests.some((guest) => guest.preference.maxBudgetCents !== undefined)) {
    const alternative = allocate(true);
    if (alternative.assignments.size > result.assignments.size ||
      (alternative.assignments.size === result.assignments.size && alternative.assignedCents > result.assignedCents)) result = alternative;
  }
  return items.map((item, index) => ({ ...item, assignedToGuestId: result.assignments.get(index) }));
}

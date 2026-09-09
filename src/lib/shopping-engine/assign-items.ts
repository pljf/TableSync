import type { GeneratedShoppingItem, Guest } from "@/lib/domain";

export function assignShoppingItems(items: GeneratedShoppingItem[], guests: Guest[]): GeneratedShoppingItem[] {
  const eligibleGuests = guests.filter((guest) => guest.canBring);
  if (eligibleGuests.length === 0) {
    return items.map((item) => ({ ...item, assignedToGuestId: undefined }));
  }

  const assignedCost = new Map<string, number>(eligibleGuests.map((guest) => [guest.id, 0]));
  const assignments = new Map<number, string>();
  const sortedItems = items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (b.item.estimatedCostCents ?? 0) - (a.item.estimatedCostCents ?? 0) ||
        a.item.ingredient.id.localeCompare(b.item.ingredient.id) ||
        a.item.unit.localeCompare(b.item.unit)
    );

  for (const { item, index } of sortedItems) {
    const assignee = [...eligibleGuests].sort(
      (a, b) =>
        (assignedCost.get(a.id) ?? 0) - (assignedCost.get(b.id) ?? 0) || a.id.localeCompare(b.id)
    )[0];
    const nextCost = (assignedCost.get(assignee.id) ?? 0) + (item.estimatedCostCents ?? 0);
    assignedCost.set(assignee.id, nextCost);
    assignments.set(index, assignee.id);
  }

  return items.map((item, index) => ({
    ...item,
    assignedToGuestId: assignments.get(index)
  }));
}


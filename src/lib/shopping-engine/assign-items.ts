import type { GeneratedShoppingItem, Guest } from "@/lib/domain";

export function assignShoppingItems(items: GeneratedShoppingItem[], guests: Guest[]): GeneratedShoppingItem[] {
  const eligibleGuests = guests.filter((guest) => guest.canBring);
  if (eligibleGuests.length === 0) {
    return items.map((item) => ({ ...item, assignedToGuestId: undefined }));
  }

  const assignedCost = new Map<string, number>(eligibleGuests.map((guest) => [guest.id, 0]));
  const sortedItems = [...items].sort((a, b) => (b.estimatedCostCents ?? 0) - (a.estimatedCostCents ?? 0));

  return sortedItems.map((item) => {
    const assignee = [...eligibleGuests].sort((a, b) => (assignedCost.get(a.id) ?? 0) - (assignedCost.get(b.id) ?? 0))[0];
    const nextCost = (assignedCost.get(assignee.id) ?? 0) + (item.estimatedCostCents ?? 0);
    assignedCost.set(assignee.id, nextCost);
    return {
      ...item,
      assignedToGuestId: assignee.id
    };
  });
}


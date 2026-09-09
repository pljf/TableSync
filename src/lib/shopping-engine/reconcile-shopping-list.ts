import type { GeneratedShoppingItem, ShoppingItem } from "@/lib/domain";

/** Match the same ingredient and unit so contribution edits retain grocery work. */
export function reconcileShoppingList(existing: ShoppingItem[], generated: GeneratedShoppingItem[]) {
  const byIngredient = new Map(existing.map((item) => [JSON.stringify([item.ingredient.id, item.unit]), item]));
  const retainedIds = new Set<string>();
  const items = generated.map((item, sortOrder) => {
    const previous = byIngredient.get(JSON.stringify([item.ingredient.id, item.unit]));
    // A shopper may still have an old purchase form open. Replace increased
    // quantities so that stale acknowledgements cannot mark extra food bought.
    const retainedId = previous && item.quantity <= previous.quantity ? previous.id : undefined;
    if (retainedId) retainedIds.add(retainedId);
    return {
      ...item,
      id: retainedId,
      sortOrder,
      // A deliberate unassignment is also work to preserve.
      assignedToGuestId: previous ? previous.assignedToGuestId : item.assignedToGuestId,
      // A smaller quantity is already covered; an increase needs another check.
      checked: Boolean(previous?.checked && item.quantity <= previous.quantity)
    };
  });
  return { items, removedIds: existing.filter((item) => !retainedIds.has(item.id)).map((item) => item.id) };
}

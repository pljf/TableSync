import { describe, expect, it } from "vitest";
import type { GeneratedShoppingItem, ShoppingItem } from "@/lib/domain";
import { reconcileShoppingList } from "@/lib/shopping-engine/reconcile-shopping-list";

const item = {
  id: "grocery-1", roomId: "room-1", ingredient: { id: "rice", name: "Rice", category: "PANTRY", defaultUnit: "cups", tags: [] },
  quantity: 4, unit: "cups", estimatedCostCents: 500, assignedToGuestId: "guest-1", checked: true,
  createdAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:00:00Z"
} satisfies ShoppingItem;
const generated = (changes: Partial<GeneratedShoppingItem> = {}): GeneratedShoppingItem => ({
  ingredient: item.ingredient, quantity: 4, unit: "cups", estimatedCostCents: 500, assignedToGuestId: "guest-2", ...changes
});

describe("shopping reconciliation after contribution edits", () => {
  it.each([4, 2])("preserves the same row, owner and purchased check when quantity becomes %s", (quantity) => {
    expect(reconcileShoppingList([item], [generated({ quantity })])).toMatchObject({
      removedIds: [], items: [{ id: item.id, quantity, assignedToGuestId: "guest-1", checked: true }]
    });
  });
  it("retains the assignment but invalidates stale purchase forms when more is needed", () => {
    expect(reconcileShoppingList([item], [generated({ quantity: 6 })])).toMatchObject({
      removedIds: [item.id], items: [{ id: undefined, quantity: 6, assignedToGuestId: "guest-1", checked: false }]
    });
  });
  it("preserves deliberate unassignment instead of applying a new automatic suggestion", () => {
    expect(reconcileShoppingList([{ ...item, assignedToGuestId: undefined }], [generated()]).items[0].assignedToGuestId).toBeUndefined();
  });
  it("removes obsolete ingredients and treats a different unit as a new unchecked row", () => {
    expect(reconcileShoppingList([item], [generated({ unit: "kg" })])).toMatchObject({
      removedIds: [item.id], items: [{ id: undefined, unit: "kg", checked: false, assignedToGuestId: "guest-2" }]
    });
  });
  it("supports no remaining shared groceries and freshly restored groceries", () => {
    expect(reconcileShoppingList([item], [])).toEqual({ items: [], removedIds: [item.id] });
    expect(reconcileShoppingList([], [generated()])).toMatchObject({
      removedIds: [], items: [{ id: undefined, checked: false, assignedToGuestId: "guest-2" }]
    });
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ShoppingList } from "@/components/shopping/shopping-list";
import type { ShoppingItem } from "@/lib/domain";
import { ingredients } from "@/lib/seed-data";

vi.mock("@/components/shopping/shopping-item-controls", () => ({ ShoppingItemControls: () => null }));
const guest = { id: "guest-1", name: "Maya", canBring: true, maxBudgetCents: 500 };
const item = { id: "item-1", roomId: "room-1", ingredient: ingredients.chicken, quantity: 2, unit: "lb", estimatedCostCents: 600,
  checked: false, createdAt: "2026-10-02", updatedAt: "2026-10-02" } satisfies ShoppingItem;

describe("shopping budget feedback", () => {
  it("shows budget comfort and actionable unassigned conditions", () => {
    const html = renderToStaticMarkup(createElement(ShoppingList, { items: [item], guests: [guest], hostCanManage: false }));
    expect(html).toContain("Maya: $0 / $5 comfort");
    expect(html).toContain("1 unassigned item cannot fit");
    expect(html).toContain("Reassign groceries, adjust budget comfort, or revise the menu");
  });

  it("shows manual excess including contributed dishes", () => {
    const html = renderToStaticMarkup(createElement(ShoppingList, { items: [{ ...item, assignedToGuestId: guest.id }], guests: [guest], contributionCosts: { [guest.id]: 200 }, hostCanManage: false }));
    expect(html).toContain("Maya: $8 / $5 comfort");
    expect(html).toContain("Maya is $3 above budget comfort");
    expect(html).toContain("Assignment totals include contributed dishes");
  });

  it("separates unknown estimates from missing volunteers", () => {
    const html = renderToStaticMarkup(createElement(ShoppingList, { items: [{ ...item, estimatedCostCents: undefined }], guests: [{ ...guest, canBring: false }], hostCanManage: false }));
    expect(html).toContain("No guests have volunteered");
    expect(html).toContain("1 unassigned item has no price estimate");
    expect(html).toContain("No price estimate");
    expect(html).not.toContain("item cannot fit");
  });
});

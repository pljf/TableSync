"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { Guest, ShoppingItem } from "@/lib/domain";
import { formatMoney, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ShoppingItemControls } from "@/components/shopping/shopping-item-controls";

type ShoppingFilter = "ALL" | "MINE" | "UNASSIGNED" | "PURCHASED";

export function ShoppingList({
  items,
  guests,
  guestId,
  hostCanManage
}: {
  items: ShoppingItem[];
  guests: Pick<Guest, "id" | "name">[];
  guestId?: string;
  hostCanManage: boolean;
}) {
  const [filter, setFilter] = useState<ShoppingFilter>("ALL");
  const guestsById = new Map(guests.map((guest) => [guest.id, guest]));
  const filterOptions: Array<{ count: number; label: string; value: ShoppingFilter }> = [
    { count: items.length, label: "All", value: "ALL" },
    ...(guestId
      ? [
          {
            count: items.filter((item) => item.assignedToGuestId === guestId).length,
            label: "Mine",
            value: "MINE" as const
          }
        ]
      : []),
    { count: items.filter((item) => !item.assignedToGuestId).length, label: "Unassigned", value: "UNASSIGNED" },
    { count: items.filter((item) => item.checked).length, label: "Purchased", value: "PURCHASED" }
  ];
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "MINE") return item.assignedToGuestId === guestId;
        if (filter === "UNASSIGNED") return !item.assignedToGuestId;
        if (filter === "PURCHASED") return item.checked;
        return true;
      }),
    [filter, guestId, items]
  );
  const grouped = filteredItems.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const key = item.ingredient.category;
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});
  const assignmentTotals = guests
    .map((guest) => ({
      guest,
      total: items
        .filter((item) => item.assignedToGuestId === guest.id)
        .reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0)
    }))
    .filter(({ total }) => total > 0);

  return (
    <div className="shopping-groups">
      <section className="card shopping-tools" aria-label="Shopping list controls">
        <div>
          <p className="eyebrow">Assignment totals</p>
          <div className="tag-list">
            {assignmentTotals.length > 0 ? (
              assignmentTotals.map(({ guest, total }) => (
                <Badge key={guest.id} tone="info">
                  {guest.name}: {formatMoney(total)}
                </Badge>
              ))
            ) : (
              <span className="muted">No items are assigned yet</span>
            )}
          </div>
        </div>
        <div className="shopping-filters" role="group" aria-label="Filter shopping items">
          {filterOptions.map((option) => (
            <button
              aria-pressed={filter === option.value}
              className="filter-chip"
              key={option.value}
              onClick={() => setFilter(option.value)}
              type="button"
            >
              {option.label} <span>{option.count}</span>
            </button>
          ))}
        </div>
      </section>
      <p className="sr-only" role="status" aria-atomic="true">
        Showing {filteredItems.length} of {items.length} shopping items. {filterOptions.find((option) => option.value === filter)?.label} filter selected.
      </p>
      {items.length > 0 && items.every((item) => item.checked) ? (
        <section className="card shopping-complete" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h2>Shopping complete</h2>
            <p>Everything is checked off. You’re ready to bring everyone to the table.</p>
          </div>
        </section>
      ) : null}
      {filteredItems.length > 0 ? (
        Object.entries(grouped).map(([category, categoryItems]) => (
          <section className="card shopping-category" key={category}>
            <div className="card-heading">
              <div>
                <p className="eyebrow">
                  {categoryItems.length} {categoryItems.length === 1 ? "item" : "items"}
                </p>
                <h2>{humanize(category)}</h2>
              </div>
              <Badge tone="info">
                {formatMoney(categoryItems.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0))}
              </Badge>
            </div>
            <div className="shopping-list">
              {categoryItems.map((item) => {
                const assignedGuest = item.assignedToGuestId ? guestsById.get(item.assignedToGuestId) : undefined;
                return (
                  <article className={`shopping-row${item.checked ? " is-purchased" : ""}`} key={item.id}>
                    <div className="shopping-main">
                      {item.checked ? <CheckCircle2 size={18} className="success-icon" /> : <Circle size={18} />}
                      <div>
                        <strong>{item.ingredient.name}</strong>
                        <span>
                          {item.quantity} {item.unit} · {formatMoney(item.estimatedCostCents)}
                        </span>
                      </div>
                    </div>
                    <ShoppingItemControls
                      assignedToGuestId={item.assignedToGuestId}
                      checked={item.checked}
                      guests={guests}
                      guestId={guestId}
                      hostCanManage={hostCanManage}
                      itemId={item.id}
                      itemName={item.ingredient.name}
                    />
                    <span className="assignee">{assignedGuest ? assignedGuest.name : "Unassigned"}</span>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <article className="card empty-state" aria-live="polite">
          <h2>No items match this filter</h2>
          <p className="muted">Choose another filter to continue working through the shopping list.</p>
        </article>
      )}
    </div>
  );
}

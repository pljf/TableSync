import { CheckCircle2, Circle } from "lucide-react";
import type { Guest, ShoppingItem } from "@/lib/domain";
import { formatMoney, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ShoppingItemControls } from "@/components/shopping/shopping-item-controls";

export function ShoppingList({
  items,
  guests,
  guestId,
  hostCanManage
}: {
  items: ShoppingItem[];
  guests: Guest[];
  guestId?: string;
  hostCanManage: boolean;
}) {
  const guestsById = new Map(guests.map((guest) => [guest.id, guest]));
  const grouped = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const key = item.ingredient.category;
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="shopping-groups">
      {Object.entries(grouped).map(([category, categoryItems]) => (
        <section className="card" key={category}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">{categoryItems.length} items</p>
              <h2>{humanize(category)}</h2>
            </div>
            <Badge tone="info">{formatMoney(categoryItems.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0))}</Badge>
          </div>
          <div className="shopping-list">
            {categoryItems.map((item) => {
              const assignedGuest = item.assignedToGuestId ? guestsById.get(item.assignedToGuestId) : undefined;
              return (
                <article className="shopping-row" key={item.id}>
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
      ))}
    </div>
  );
}


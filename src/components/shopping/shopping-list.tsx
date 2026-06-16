import { CheckCircle2, Circle, PackageCheck, UserPlus } from "lucide-react";
import type { Guest, ShoppingItem } from "@/lib/domain";
import { claimShoppingAction, toggleShoppingAction } from "@/app/actions";
import { formatMoney, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function ShoppingList({ items, guests }: { items: ShoppingItem[]; guests: Guest[] }) {
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
                  <form action={claimShoppingAction} className="inline-form">
                    <input type="hidden" name="itemId" value={item.id} />
                    <UserPlus size={16} />
                    <select name="guestId" defaultValue={item.assignedToGuestId ?? ""} aria-label={`Assign ${item.ingredient.name}`}>
                      <option value="">Unassigned</option>
                      {guests.map((guest) => (
                        <option key={guest.id} value={guest.id}>
                          {guest.name}
                        </option>
                      ))}
                    </select>
                    <button className="icon-button" type="submit" aria-label={`Save assignment for ${item.ingredient.name}`}>
                      <PackageCheck size={16} />
                    </button>
                  </form>
                  <form action={toggleShoppingAction} className="inline-form">
                    <input type="hidden" name="itemId" value={item.id} />
                    <label className="checkbox-label">
                      <input name="checked" type="checkbox" defaultChecked={item.checked} />
                      Purchased
                    </label>
                    <button className="button secondary small" type="submit">
                      Save
                    </button>
                  </form>
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


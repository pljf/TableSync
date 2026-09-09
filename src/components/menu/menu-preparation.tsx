import type { EventType, Guest, MenuPlan } from "@/lib/domain";
import { compareMenuDishes, formatServings, menuDishRole } from "@/lib/menu-presentation";
import { preparationIngredients } from "@/lib/menu-preparation";

export function MenuPreparation({ plan, eventType, guests }: {
  plan: MenuPlan;
  eventType: EventType;
  guests: Pick<Guest, "id" | "name">[];
}) {
  if (plan.status !== "FINALIZED") return null;
  const adjustments = plan.warnings.filter((warning) => warning.type === "SPICE_ADJUSTMENT");

  return (
    <section aria-labelledby="menu-preparation-heading" className="card menu-preparation" id="menu-preparation" tabIndex={-1}>
      <header>
        <p className="eyebrow">Ready to make it</p>
        <h2 id="menu-preparation-heading">Prepare this menu</h2>
        <p className="muted">Open a dish for its planned portions and ingredients. Times are estimates for each dish, not the whole meal.</p>
      </header>
      {adjustments.length > 0 ? (
        <aside aria-label="Menu adjustments" className="warning-list">
          {adjustments.map((warning) => <p key={warning.message}>{warning.message}</p>)}
        </aside>
      ) : null}
      <div className="preparation-dishes">
        {[...plan.dishes].sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType)).map((planDish) => {
          const { dish, servings, contributionGuestId, contributionReady } = planDish;
          const ingredients = preparationIngredients(planDish);
          const contributor = guests.find((guest) => guest.id === contributionGuestId);
          return (
            <details className="preparation-dish" key={planDish.id ?? dish.id}>
              <summary>
                <span className="preparation-dish-name">{dish.name}</span>
                <span className="muted preparation-dish-meta">{formatServings(servings)} · {dish.prepTimeMinutes > 0 ? `About ${dish.prepTimeMinutes} min` : "Prep time not listed"}</span>
              </summary>
              <p className="muted">{menuDishRole(dish, eventType)}{dish.description ? ` · ${dish.description}` : ""}</p>
              {eventType === "POTLUCK" ? (
                <p className="muted">{contributor ? `${contributor.name} is bringing this dish${contributionReady ? " — ready to bring" : ""}. Its ingredients are handled by the contributor.` : "Its ingredients are included in shared shopping."}</p>
              ) : null}
              {ingredients.length > 0 ? (
                <ul aria-label={`Ingredients for ${dish.name}`} className="dish-list">
                  {ingredients.map(({ ingredient, quantity, unit }) => (
                    <li key={`${ingredient.id}-${unit}`}><span>{ingredient.name}</span><small>{quantity} {unit}</small></li>
                  ))}
                </ul>
              ) : <p className="muted">Ingredients have not been listed for this dish.</p>}
            </details>
          );
        })}
      </div>
      <p className="muted preparation-footnote">Amounts are scaled shopping estimates. Follow your recipe for cooking quantities and the menu’s adjustment notes. Cooking steps aren’t included yet.</p>
    </section>
  );
}

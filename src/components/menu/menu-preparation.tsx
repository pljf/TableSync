import type { EventType, Guest, MenuPlan } from "@/lib/domain";
import { compareMenuDishes, formatServings, menuDishRole } from "@/lib/menu-presentation";
import { preparationIngredients } from "@/lib/menu-preparation";
import { cookingGuideFor, cookingOrder, cookingSafetyNotes } from "@/lib/cooking-plan/planning";
import { cookingReferences, cookingSafetySources } from "@/lib/cooking-plan/references";
import type { CookingPhase } from "@/lib/cooking-plan/types";
import { FoodIcon } from "@/components/menu/food-icon";

const phaseLabels: Record<CookingPhase, string> = {
  START: "Start ahead",
  COOK: "Cook & assemble",
  FINISH: "Just before serving"
};
const safetyTitles: Record<string, string> = {
  [cookingSafetySources.temperature]: "Safe cooking temperatures",
  [cookingSafetySources.handling]: "Handling, storage & serving",
  [cookingSafetySources.picnic]: "Keeping picnic food cold"
};

export function MenuPreparation({ plan, eventType, guests }: {
  plan: MenuPlan;
  eventType: EventType;
  guests: Pick<Guest, "id" | "name">[];
}) {
  if (plan.status !== "FINALIZED") return null;
  const adjustments = plan.warnings.filter((warning) => warning.type === "SPICE_ADJUSTMENT");
  const order = cookingOrder(plan, eventType);
  const safety = cookingSafetyNotes(plan, eventType);
  const hasContributions = eventType === "POTLUCK" && plan.dishes.some((dish) => dish.contributionGuestId);

  return (
    <section aria-labelledby="menu-preparation-heading" className="card menu-preparation" id="menu-preparation" tabIndex={-1}>
      <header>
        <h2 id="menu-preparation-heading">Prepare this menu</h2>
        <p className="muted">Follow the preparation order, then open a dish for portions, ingredients and TableSync preparation notes. Times are estimates for each dish; larger batches and chilling can take longer.</p>
      </header>
      {adjustments.length > 0 ? (
        <aside aria-label="Menu adjustments" className="warning-list">
          {adjustments.map((warning) => <p key={warning.message}>{warning.message}</p>)}
        </aside>
      ) : null}
      <div className="preparation-order" aria-labelledby="preparation-order-heading">
        <h3 id="preparation-order-heading">Suggested preparation order</h3>
        <p className="muted">Start longer tasks first within each stage. This is a guide to the work, not a timed schedule; check your equipment and recipe before starting.</p>
        {hasContributions ? <p className="muted">Claimed Potluck dishes are handled by their contributors. Their ingredients and any available preparation notes remain below.</p> : null}
        {order.length > 0 ? order.map(({ phase, tasks }) => (
          <div className="preparation-phase" key={phase}>
            <h4>{phaseLabels[phase]}</h4>
            <ul aria-label={`${phaseLabels[phase]} tasks`}>
              {tasks.map(({ item, task }) => <li key={item.id ?? item.dish.id}><strong>{item.dish.name}</strong><span>{task}</span></li>)}
            </ul>
          </div>
        )) : <p className="muted">{hasContributions ? "Every dish is assigned to a contributor. Confirm transport and serving arrangements with them." : "Add dishes to this menu to build a preparation order."}</p>}
      </div>
      <div className="preparation-dishes">
        <h3>Dish instructions</h3>
        {[...plan.dishes].sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType)).map((planDish) => {
          const { dish, servings, contributionGuestId, contributionReady } = planDish;
          const ingredients = preparationIngredients(planDish);
          const guide = cookingGuideFor(dish);
          const contributor = guests.find((guest) => guest.id === contributionGuestId);
          return (
            <details className="preparation-dish" key={planDish.id ?? dish.id}>
              <summary>
                <span className="preparation-dish-name food-name"><FoodIcon dish={dish} compact /><span>{dish.name}</span></span>
                <span className="muted preparation-dish-meta">{formatServings(servings)} · {dish.prepTimeMinutes > 0 ? `About ${dish.prepTimeMinutes} min` : "Prep time not listed"}</span>
              </summary>
              <p className="muted">{menuDishRole(dish, eventType)}{dish.description ? ` · ${dish.description}` : ""}</p>
              {eventType === "POTLUCK" ? (
                <p className="muted">{contributionGuestId ? `${contributor?.name ?? "A contributor"} is bringing this dish${contributionReady ? " — ready to bring" : ""}. Its ingredients are handled by the contributor.` : "Its ingredients are included in shared shopping."}</p>
              ) : null}
              {ingredients.length > 0 ? (
                <>
                  <h4>Planned ingredients</h4>
                  <ul aria-label={`Ingredients for ${dish.name}`} className="dish-list">
                    {ingredients.map(({ ingredient, quantity, unit }) => (
                      <li key={`${ingredient.id}-${unit}`}><span>{ingredient.name}</span><small>{quantity} {unit}</small></li>
                    ))}
                  </ul>
                  <p className="muted">Amounts follow the menu’s planned portions. Bottles, jars and boxes describe shopping amounts; use seasonings to taste and follow package cooking quantities.</p>
                </>
              ) : <p className="muted">Ingredients have not been listed for this dish.</p>}
              {guide ? (
                <div className="preparation-guide">
                  <h4>TableSync preparation notes</h4>
                  <p className="muted">Equipment: {guide.equipment.join(", ")}.</p>
                  {guide.notice ? <p className="preparation-notice">{guide.notice}</p> : null}
                  <ol aria-label={`Preparation steps for ${dish.name}`} className="preparation-steps">
                    {guide.steps.map((step, index) => <li key={index}>{step}</li>)}
                  </ol>
                  {guide.referenceIds.length > 0 ? (
                    <div className="preparation-references">
                      <h4>Related recipes & techniques</h4>
                      <p className="muted">These publisher recipes support a technique; their ingredients, food restrictions and timings can differ from this menu.</p>
                      <ul aria-label={`References for ${dish.name}`}>
                        {guide.referenceIds.map((id) => {
                          const reference = cookingReferences[id];
                          return <li key={id}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.publisher}: {reference.title}<span className="sr-only"> (opens in a new tab)</span></a><p className="muted">{reference.difference}</p></li>;
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : <p className="preparation-notice">Cooking guidance is not available for this recipe. Use the recipe owner’s instructions before starting.</p>}
            </details>
          );
        })}
      </div>
      <details className="preparation-safety">
        <summary>Food safety & serving</summary>
        <ul aria-label="Food safety reminders">{safety.map(({ text }) => <li key={text}>{text}</li>)}</ul>
        <p className="muted">Official guidance from FoodSafety.gov:</p>
        <ul aria-label="Official food safety sources" className="preparation-source-links">
          {[...new Set(safety.map(({ url }) => url))].map((url) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{safetyTitles[url]}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
        </ul>
      </details>
      <p className="muted preparation-footnote">These authored notes use the listed ingredients and plain water. Follow the menu’s food restrictions, package labels and adjustment notes; keep alternatives and their utensils separate.</p>
    </section>
  );
}

import { HandHeart } from "lucide-react";
import type { Guest, MenuPlan } from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import { compareMenuDishes, contributionCostCents, contributionSummary, formatServings } from "@/lib/menu-presentation";
import { Badge } from "@/components/ui/badge";
import { PotluckContributionControls } from "@/components/menu/potluck-contribution-controls";
import { FoodIcon } from "@/components/menu/food-icon";

export function PotluckContributions({ plan, guests, guestId, isHost, hasShopping }: {
  plan: MenuPlan;
  guests: Guest[];
  guestId?: string;
  isHost: boolean;
  hasShopping: boolean;
}) {
  const summary = contributionSummary(plan.dishes);
  const currentGuest = guests.find((guest) => guest.id === guestId);

  return (
    <section aria-label="Potluck contributions" className="page-stack contribution-panel">
      <header className="card contribution-intro">
        <div className="section-title"><HandHeart aria-hidden="true" size={21} /><h2>Who’s bringing what</h2></div>
        <p>Take a whole dish with its planned servings and ingredients. Unclaimed dishes stay on the shared grocery list; a contributor handles every ingredient for their dish.</p>
        <p className="muted">Claiming or releasing a dish updates only the groceries still needed. Existing assignments and purchase checks are kept; increased quantities need a new purchase check. Switching contributors leaves shopping unchanged and resets only that dish’s readiness.</p>
        <div className="tag-list">
          <Badge tone="info">{summary.claimedDishes}/{summary.totalDishes} dishes claimed</Badge>
          <Badge tone={summary.readyDishes === summary.totalDishes ? "success" : "neutral"}>{summary.readyDishes} ready to bring</Badge>
        </div>
        <p><strong>{formatMoney(summary.contributedCostCents)} contributed food</strong> is included in the {formatMoney(plan.estimatedCostCents)} total food estimate and budget.</p>
        {plan.warnings.filter((warning) => warning.type === "SPICE_ADJUSTMENT").map((warning) => <p className="muted" key={warning.message}>{warning.message}</p>)}
        {currentGuest && !currentGuest.canBring && !isHost ? <p className="muted">Your saved response says you cannot bring food. You can follow the contributions here; only guests who offered to bring food can claim dishes.</p> : null}
        {isHost && !guests.some((guest) => guest.canBring) ? <p className="muted">No guests offered to bring food. The complete menu remains on the shared grocery list.</p> : null}
      </header>
      <div className="grid two contribution-grid">
        {[...plan.dishes].sort((left, right) => compareMenuDishes(left.dish, right.dish, "POTLUCK")).map((planDish) => {
          const { dish, servings, contributionGuestId, contributionReady } = planDish;
          const owner = guests.find((guest) => guest.id === contributionGuestId);
          const canViewRecipe = isHost || Boolean(guestId && contributionGuestId === guestId);
          return (
            <article className="card contribution-card" data-contribution-dish-id={planDish.id} key={planDish.id ?? dish.id}>
              <div className="card-heading">
                <div><h3 className="food-name"><FoodIcon dish={dish} /><span>{dish.name}</span></h3><p className="muted">{formatServings(servings)} · {formatMoney(contributionCostCents(planDish))} estimate</p></div>
                <Badge tone={contributionReady ? "success" : contributionGuestId ? "info" : "neutral"}>{contributionReady ? "Ready to bring" : contributionGuestId ? "Getting ready" : "Shared groceries"}</Badge>
              </div>
              <p>{owner ? <><strong>{owner.name}</strong> is bringing this dish.</> : "No contributor yet. Its ingredients are included in shared shopping."}</p>
              {canViewRecipe ? (
                <details className="contribution-recipe">
                  <summary>Ingredients for {formatServings(servings)}</summary>
                  {dish.description ? <p className="muted">{dish.description}</p> : null}
                  <ul className="dish-list">
                    {dish.ingredients.map(({ ingredient, quantity, unit }) => <li key={`${ingredient.id}-${unit}`}><span>{ingredient.name}</span><small>{Number((quantity * servings / dish.baseServings).toFixed(2))} {unit}</small></li>)}
                  </ul>
                  <p className="muted">Use these planned ingredients and portions, and follow the menu’s spice adjustments, to preserve the group’s food preference coverage.</p>
                </details>
              ) : null}
              {planDish.id ? <PotluckContributionControls key={planDish.id} menuPlanDishId={planDish.id} ownerId={contributionGuestId} ready={Boolean(contributionReady)} guests={guests.map(({ id, name, canBring }) => ({ id, name, canBring }))} guestId={guestId} isHost={isHost} hasShopping={hasShopping} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

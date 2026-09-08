import { ArrowDownRight } from "lucide-react";
import type { EventType, MenuPlan, MenuPlanDish } from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import { compareMenuDishes, formatServings } from "@/lib/menu-presentation";

function dishKey({ dish, servings }: MenuPlanDish) {
  return `${dish.id}:${servings}`;
}

export function summarizeMenuComparison(plans: MenuPlan[], plannedGuestCount: number, eventType: EventType) {
  const headcount = Math.max(1, plannedGuestCount);
  const commonDishes = (plans[0]?.dishes ?? []).filter((dish) =>
    plans.every((plan) => plan.dishes.some((candidate) => dishKey(candidate) === dishKey(dish)))
  ).sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType));
  const sharedKeys = new Set(commonDishes.map(dishKey));
  const lowestCost = Math.min(...plans.map((plan) => plan.estimatedCostCents));

  return {
    headcount,
    commonDishes,
    options: plans.map((plan, index) => ({
      plan,
      optionNumber: index + 1,
      perPersonCents: Math.round(plan.estimatedCostCents / headcount),
      aboveLowestCents: plan.estimatedCostCents - lowestCost,
      differentDishes: plan.dishes.filter((dish) => !sharedKeys.has(dishKey(dish)))
        .sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType)),
      likes: plan.votes.filter((vote) => vote.value === "LIKE").length,
      neutral: plan.votes.filter((vote) => vote.value === "NEUTRAL").length,
      vetoes: plan.votes.filter((vote) => vote.value === "VETO").length
    }))
  };
}

export function MenuComparison({ plans, plannedGuestCount, eventType }: {
  plans: MenuPlan[];
  plannedGuestCount: number;
  eventType: EventType;
}) {
  if (plans.length < 2) return null;
  const comparison = summarizeMenuComparison(plans, plannedGuestCount, eventType);
  const costsDiffer = comparison.options.some((option) => option.aboveLowestCents > 0);

  return (
    <section aria-labelledby="menu-comparison-heading" className="card menu-comparison">
      <div className="menu-comparison-heading">
        <h2 id="menu-comparison-heading">Compare menus</h2>
        <p className="muted">Estimates for {comparison.headcount} planned {comparison.headcount === 1 ? "guest" : "guests"}. Open a menu below to see all dishes, notes, and voting.</p>
      </div>
      {comparison.commonDishes.length > 0 ? (
        <details className="menu-shared-dishes">
          <summary>Shared by every menu: {comparison.commonDishes.length} {comparison.commonDishes.length === 1 ? "dish" : "dishes"}</summary>
          <ul>{comparison.commonDishes.map(({ dish, servings }) => <li key={dish.id}>{dish.name} · {formatServings(servings)}</li>)}</ul>
        </details>
      ) : null}
      <div className="menu-comparison-options">
        {comparison.options.map(({ plan, optionNumber, perPersonCents, aboveLowestCents, differentDishes, likes, neutral, vetoes }) => (
          <article aria-labelledby={`compare-${plan.id}`} className="menu-comparison-option" key={plan.id}>
            <div className="menu-comparison-name">
              <p className="eyebrow">Option {String(optionNumber).padStart(2, "0")}</p>
              <h3 id={`compare-${plan.id}`}>{plan.title}</h3>
              <a className="menu-comparison-link" href={`#menu-plan-${plan.id}`}>
                View menu {optionNumber}<ArrowDownRight aria-hidden="true" size={16} />
              </a>
            </div>
            <dl className="menu-comparison-estimate">
              <div><dt>Total estimate</dt><dd>{formatMoney(plan.estimatedCostCents)}</dd></div>
              <div><dt>Per person</dt><dd>{formatMoney(perPersonCents)}</dd></div>
              {costsDiffer ? <div className="menu-cost-difference"><dt className="sr-only">Estimate comparison</dt><dd>{aboveLowestCents === 0 ? "Lowest estimate" : `${formatMoney(aboveLowestCents)} above lowest`}</dd></div> : null}
            </dl>
            <div className="menu-comparison-differences">
              <h4>What changes</h4>
              {differentDishes.length > 0 ? (
                <ul>{differentDishes.map(({ dish, servings }) => <li key={dish.id}><span>{dish.name}</span><small>{formatServings(servings)}</small></li>)}</ul>
              ) : <p className="muted">{comparison.commonDishes.length === plan.dishes.length ? "Only the shared dishes above." : "No dish or portion differences."}</p>}
            </div>
            <div className="menu-comparison-votes">
              <h4>Guest votes</h4>
              <p><strong>{likes}</strong> {likes === 1 ? "like" : "likes"} · <strong>{neutral}</strong> neutral · <strong>{vetoes}</strong> {vetoes === 1 ? "veto" : "vetoes"}</p>
              {plan.votes.length === 0 ? <small>No votes yet</small> : null}
              {vetoes > 0 ? <small className="menu-veto-note">Read the veto {vetoes === 1 ? "reason" : "reasons"} in this menu.</small> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

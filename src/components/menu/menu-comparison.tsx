import { ArrowDownRight } from "lucide-react";
import type { EventType, Guest, MenuPlan } from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import { formatServings } from "@/lib/menu-presentation";
import { summarizeMenuComparison } from "@/lib/menu-comparison";

export { summarizeMenuComparison } from "@/lib/menu-comparison";

export function MenuComparison({ plans, plannedGuestCount, eventType, guests }: {
  plans: MenuPlan[];
  plannedGuestCount: number;
  eventType: EventType;
  guests?: Pick<Guest, "id" | "name">[];
}) {
  if (plans.length < 2) return null;
  const comparison = summarizeMenuComparison(plans, plannedGuestCount, eventType, guests);
  const costsDiffer = comparison.options.some((option) => option.aboveLowestCents > 0);

  return (
    <section aria-labelledby="menu-comparison-heading" className="card menu-comparison">
      <div className="menu-comparison-heading">
        <h2 id="menu-comparison-heading">Compare menus</h2>
        <p className="muted">Estimates for {comparison.headcount} planned {comparison.headcount === 1 ? "guest" : "guests"}. Open a menu below to see all dishes, notes, and voting.</p>
      </div>
      <details className="menu-shared-dishes">
        <summary>How menu suggestions work</summary>
        <p>Suggestions use the catalog’s ingredients and tags to check the group’s food restrictions, event format, and total budget. Food preferences, preparation time, and estimated cost guide the order. Guest votes are shown separately and do not change this order.</p>
      </details>
      {comparison.commonDishes.length > 0 ? (
        <details className="menu-shared-dishes">
          <summary>Shared by every menu: {comparison.commonDishes.length} {comparison.commonDishes.length === 1 ? "dish" : "dishes"}</summary>
          <ul>{comparison.commonDishes.map(({ dish, servings }) => <li key={dish.id}>{dish.name} · {formatServings(servings)}</li>)}</ul>
        </details>
      ) : null}
      <div className="menu-comparison-options">
        {comparison.options.map(({ plan, optionNumber, displayTitle, perPersonCents, aboveLowestCents, differentDishes, likes, neutral, vetoes, participation }) => (
          <article aria-labelledby={`compare-${plan.id}`} className="menu-comparison-option" key={plan.id}>
            <div className="menu-comparison-name">
              <p className="eyebrow">Option {String(optionNumber).padStart(2, "0")}</p>
              <h3 id={`compare-${plan.id}`}>{displayTitle}</h3>
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
              {participation && participation.joinedCount > 0 ? (
                <>
                  <small>{participation.votedCount} of {participation.joinedCount} joined {participation.joinedCount === 1 ? "guest has" : "guests have"} voted</small>
                  {participation.waitingGuests.length > 0 ? (
                    <details className="menu-shared-dishes">
                      <summary>Waiting for {participation.waitingGuests.length} {participation.waitingGuests.length === 1 ? "guest" : "guests"}</summary>
                      <ul>{participation.waitingGuests.map((guest) => <li key={guest.id}>{guest.name}</li>)}</ul>
                    </details>
                  ) : null}
                </>
              ) : plan.votes.length === 0 ? <small>No votes yet</small> : null}
              {vetoes > 0 ? <small className="menu-veto-note">Read the veto {vetoes === 1 ? "reason" : "reasons"} in this menu.</small> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

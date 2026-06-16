import { Ban, CheckCircle2, CircleMinus, Heart, Trophy, Utensils } from "lucide-react";
import type { Guest, MenuPlan } from "@/lib/domain";
import { castVoteAction, finalizePlanAction } from "@/app/actions";
import { formatMoney, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

function voteCount(plan: MenuPlan, value: "LIKE" | "NEUTRAL" | "VETO") {
  return plan.votes.filter((vote) => vote.value === value).length;
}

export function MenuPlanCard({ plan, guests, canFinalize = false }: { plan: MenuPlan; guests: Guest[]; canFinalize?: boolean }) {
  const finalized = plan.status === "FINALIZED";

  return (
    <article className={`card plan-card ${finalized ? "selected" : ""}`}>
      <div className="card-heading">
        <div>
          <p className="eyebrow">Score {plan.score}</p>
          <h3>{plan.title}</h3>
        </div>
        {finalized ? (
          <Badge tone="success">Final</Badge>
        ) : (
          <Badge tone="info">Proposed</Badge>
        )}
      </div>
      <p className="muted">{plan.summary}</p>
      <div className="metric-grid compact">
        <span>
          <Trophy size={16} />
          {plan.score} score
        </span>
        <span>
          <Utensils size={16} />
          {plan.dishes.length} dishes
        </span>
        <span>
          <Heart size={16} />
          {voteCount(plan, "LIKE")} likes
        </span>
        <span>
          <Ban size={16} />
          {voteCount(plan, "VETO")} vetoes
        </span>
      </div>
      <strong className="price-line">{formatMoney(plan.estimatedCostCents)} total estimate</strong>
      <ul className="dish-list">
        {plan.dishes.map(({ dish, servings }) => (
          <li key={dish.id}>
            <span>{dish.name}</span>
            <small>
              {humanize(dish.category)} - {servings} servings
            </small>
          </li>
        ))}
      </ul>
      {plan.warnings.length > 0 ? (
        <div className="warning-list">
          {plan.warnings.map((warning) => (
            <p key={`${warning.type}-${warning.message}`}>{warning.message}</p>
          ))}
        </div>
      ) : null}
      <form action={castVoteAction} className="vote-form">
        <input type="hidden" name="planId" value={plan.id} />
        <label>
          Guest
          <select name="guestId" defaultValue={guests[0]?.id}>
            {guests.map((guest) => (
              <option key={guest.id} value={guest.id}>
                {guest.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Veto reason
          <input name="reason" placeholder="Required only for veto" />
        </label>
        <div className="button-row">
          <button className="button secondary" name="value" value="LIKE" type="submit">
            <Heart size={16} />
            Like
          </button>
          <button className="button secondary" name="value" value="NEUTRAL" type="submit">
            <CircleMinus size={16} />
            Neutral
          </button>
          <button className="button danger" name="value" value="VETO" type="submit">
            <Ban size={16} />
            Veto
          </button>
        </div>
      </form>
      {canFinalize && !finalized ? (
        <form action={finalizePlanAction.bind(null, plan.id)}>
          <button className="button full" type="submit">
            <CheckCircle2 size={16} />
            Finalize plan
          </button>
        </form>
      ) : null}
    </article>
  );
}

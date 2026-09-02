import { Ban, CheckCircle2, CircleMinus, Heart, Trophy, Utensils } from "lucide-react";
import type { MenuPlan } from "@/lib/domain";
import { finalizePlanAction } from "@/app/actions";
import { formatMoney, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { VoteForm } from "@/components/menu/vote-form";
import { MutationForm } from "@/components/ui/mutation-form";

function voteCount(plan: MenuPlan, value: "LIKE" | "NEUTRAL" | "VETO") {
  return plan.votes.filter((vote) => vote.value === value).length;
}

export function MenuPlanCard({
  plan,
  canFinalize = false,
  canVote = false
}: {
  plan: MenuPlan;
  canFinalize?: boolean;
  canVote?: boolean;
}) {
  const finalized = plan.status === "FINALIZED";
  const isHotpot = plan.dishes.some(({ dish }) => dish.hotpotRole === "BROTH");

  return (
    <article className={`card plan-card ${finalized ? "selected" : ""}`} data-plan-id={plan.id}>
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
          <CircleMinus size={16} />
          {voteCount(plan, "NEUTRAL")} neutral
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
              {humanize(isHotpot ? (dish.hotpotRole ?? dish.category) : dish.category)} - {servings} servings
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
      {canVote ? (
        <VoteForm planId={plan.id} />
      ) : (
        <p className="muted">Voting is closed while the room is not in the voting stage.</p>
      )}
      {canFinalize && !finalized ? (
        <MutationForm action={finalizePlanAction.bind(null, plan.id)}>
          <SubmitButton className="button full" pendingLabel="Finalizing plan...">
            <CheckCircle2 size={16} />
            Finalize plan
          </SubmitButton>
        </MutationForm>
      ) : null}
    </article>
  );
}

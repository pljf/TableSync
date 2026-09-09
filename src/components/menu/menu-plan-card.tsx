import { Ban, CheckCircle2, CircleMinus, Heart, Utensils } from "lucide-react";
import type { EventType, Guest, MenuPlan } from "@/lib/domain";
import { finalizePlanAction } from "@/app/actions";
import { formatMoney } from "@/lib/format";
import { compareMenuDishes, formatServings, menuDishRole } from "@/lib/menu-presentation";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { VoteForm } from "@/components/menu/vote-form";
import { VetoReasons } from "@/components/menu/veto-reasons";
import { MutationForm } from "@/components/ui/mutation-form";

function voteCount(plan: MenuPlan, value: "LIKE" | "NEUTRAL" | "VETO") {
  return plan.votes.filter((vote) => vote.value === value).length;
}

export function MenuPlanCard({
  plan,
  canFinalize = false,
  canVote = false,
  currentGuestId,
  eventType = "DINNER",
  guests,
  optionNumber,
  votingOpen = false,
  plannedGuestCount = Math.max(guests?.length ?? 0, 1),
  featured = false
}: {
  plan: MenuPlan;
  canFinalize?: boolean;
  canVote?: boolean;
  currentGuestId?: string;
  eventType?: EventType;
  guests?: Pick<Guest, "id" | "name">[];
  optionNumber?: number;
  votingOpen?: boolean;
  plannedGuestCount?: number;
  featured?: boolean;
}) {
  const finalized = plan.status === "FINALIZED";
  const orderedDishes = [...plan.dishes].sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType));
  const currentVote = currentGuestId ? plan.votes.find((vote) => vote.guestId === currentGuestId) : undefined;

  return (
    <article className={`card plan-card ${finalized ? "selected" : ""} ${featured ? "featured-plan" : ""}`} data-plan-id={plan.id} id={`menu-plan-${plan.id}`} tabIndex={-1}>
      <div className="card-heading">
        <div>
          <p className="eyebrow">{featured ? "Chosen for your table" : optionNumber ? `Menu option ${String(optionNumber).padStart(2, "0")}` : "At your table"}</p>
          <h3>{plan.title}</h3>
        </div>
        {finalized ? (
          <Badge tone="success">Final</Badge>
        ) : (
          <Badge tone={plan.status === "REJECTED" ? "neutral" : "info"}>{plan.status === "REJECTED" ? "Not selected" : "Proposed"}</Badge>
        )}
      </div>
      <p className="muted">{plan.summary}</p>
      <div className="metric-grid compact">
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
      <p className="muted menu-per-person">{formatMoney(Math.round(plan.estimatedCostCents / Math.max(plannedGuestCount, 1)))} per person · {Math.max(plannedGuestCount, 1)} planned {plannedGuestCount === 1 ? "guest" : "guests"}</p>
      {eventType === "POTLUCK" ? <p className="muted">Includes every dish, including food guests contribute.{finalized ? " Manage whole-dish contributions below." : " Claim dishes after finalization."}</p> : null}
      <ul className="dish-list">
        {orderedDishes.map(({ dish, servings }) => (
          <li key={dish.id}>
            <span>{dish.name}</span>
            <small>
              {menuDishRole(dish, eventType)} - {formatServings(servings)}
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
      <VetoReasons guests={guests} votes={plan.votes} />
      {canVote && !finalized ? (
        <VoteForm currentVote={currentVote} planId={plan.id} />
      ) : !finalized ? (
        <p className="muted">
          {votingOpen ? "Guests with a room session can vote on this plan." : "Voting is closed for this plan."}
        </p>
      ) : null}
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

import type { EventType, Guest, MenuPlan } from "@/lib/domain";
import { MenuComparison } from "@/components/menu/menu-comparison";
import { MenuPlanCard } from "@/components/menu/menu-plan-card";

export function MenuPlanReview({ plans, eventType, guests, plannedGuestCount, currentGuestId, canFinalize, canVote, votingOpen }: {
  plans: MenuPlan[];
  eventType: EventType;
  guests: Guest[];
  plannedGuestCount: number;
  currentGuestId?: string;
  canFinalize: boolean;
  canVote: boolean;
  votingOpen: boolean;
}) {
  const finalPlan = plans.find((plan) => plan.status === "FINALIZED");
  const alternatives = plans.filter((plan) => plan.id !== finalPlan?.id);

  function card(plan: MenuPlan, featured = false) {
    return (
      <MenuPlanCard
        key={plan.id}
        plan={plan}
        eventType={eventType}
        optionNumber={plans.findIndex((candidate) => candidate.id === plan.id) + 1}
        guests={guests}
        plannedGuestCount={plannedGuestCount}
        canFinalize={!finalPlan && canFinalize}
        canVote={!finalPlan && canVote}
        currentGuestId={currentGuestId}
        votingOpen={!finalPlan && votingOpen}
        featured={featured}
      />
    );
  }

  if (finalPlan) {
    return (
      <div className="menu-review finalized-menu-review">
        <section aria-labelledby="selected-menu-heading" className="selected-menu-section">
          <h2 id="selected-menu-heading">Your selected menu</h2>
          {card(finalPlan, true)}
        </section>
        {alternatives.length > 0 ? (
          <details className="card menu-alternatives">
            <summary>Other menu options ({alternatives.length})</summary>
            <p className="muted">Saved for reference. Shopping uses the selected menu above.</p>
            <section aria-label="Other menu options" className="grid three menu-plan-grid">
              {alternatives.map((plan) => card(plan))}
            </section>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="menu-review">
      <MenuComparison plans={plans} plannedGuestCount={plannedGuestCount} eventType={eventType} guests={guests} />
      <section className="grid three menu-plan-grid" aria-label="Generated menu plans">
        {plans.map((plan) => card(plan))}
      </section>
    </div>
  );
}

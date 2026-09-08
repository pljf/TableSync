import type { EventType, Guest, MenuPlan, MenuPlanDish } from "@/lib/domain";
import { compareMenuDishes, formatServings } from "@/lib/menu-presentation";

function dishKey({ dish, servings }: MenuPlanDish) {
  return `${dish.id}:${servings}`;
}

function comparisonTitle(plan: MenuPlan, plans: MenuPlan[], eventType: EventType): string {
  const peers = plans.filter((candidate) => candidate.title.trim().toLowerCase() === plan.title.trim().toLowerCase());
  if (peers.length < 2) return plan.title;
  const others = peers.filter((candidate) => candidate.id !== plan.id);
  const differences = plan.dishes.filter((item) =>
    !others.every((other) => other.dishes.some((candidate) => dishKey(candidate) === dishKey(item)))
  ).sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType));
  if (differences.length === 0) {
    if (!others.some((other) => other.dishes.length !== plan.dishes.length)) return plan.title;
    return [...plan.dishes]
      .sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType))
      .slice(0, 2)
      .map(({ dish }) => dish.name)
      .join(" + ") || plan.title;
  }

  // Prefer one distinctive dish, then a pair, without repeating a long menu.
  const choices = [
    ...differences.map((item) => [item]),
    ...differences.flatMap((item, index) => differences.slice(index + 1).map((other) => [item, other]))
  ];
  const distinctive = choices.find((choice) => others.every((other) =>
    !choice.every((item) => other.dishes.some((candidate) => dishKey(candidate) === dishKey(item)))
  )) ?? differences.slice(0, 2);
  return distinctive.map((item) => {
    const portionsDiffer = peers.some((peer) => peer.dishes.some((candidate) =>
      candidate.dish.id === item.dish.id && candidate.servings !== item.servings
    ));
    return portionsDiffer ? `${item.dish.name} (${formatServings(item.servings)})` : item.dish.name;
  }).join(" + ");
}

export function summarizeMenuComparison(
  plans: MenuPlan[],
  plannedGuestCount: number,
  eventType: EventType,
  guests?: Pick<Guest, "id" | "name">[]
) {
  const headcount = Math.max(1, plannedGuestCount);
  const participants = guests ? [...new Map(guests.map((guest) => [guest.id, guest])).values()] : undefined;
  const commonDishes = (plans[0]?.dishes ?? []).filter((dish) =>
    plans.every((plan) => plan.dishes.some((candidate) => dishKey(candidate) === dishKey(dish)))
  ).sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType));
  const sharedKeys = new Set(commonDishes.map(dishKey));
  const lowestCost = Math.min(...plans.map((plan) => plan.estimatedCostCents));

  return {
    headcount,
    commonDishes,
    options: plans.map((plan, index) => {
      const votedGuestIds = new Set(plan.votes.map((vote) => vote.guestId));
      const waitingGuests = participants?.filter((guest) => !votedGuestIds.has(guest.id));
      return {
        plan,
        optionNumber: index + 1,
        displayTitle: comparisonTitle(plan, plans, eventType),
        perPersonCents: Math.round(plan.estimatedCostCents / headcount),
        aboveLowestCents: plan.estimatedCostCents - lowestCost,
        differentDishes: plan.dishes.filter((dish) => !sharedKeys.has(dishKey(dish)))
          .sort((left, right) => compareMenuDishes(left.dish, right.dish, eventType)),
        likes: plan.votes.filter((vote) => vote.value === "LIKE").length,
        neutral: plan.votes.filter((vote) => vote.value === "NEUTRAL").length,
        vetoes: plan.votes.filter((vote) => vote.value === "VETO").length,
        participation: participants && waitingGuests ? {
          joinedCount: participants.length,
          votedCount: participants.length - waitingGuests.length,
          waitingGuests
        } : undefined
      };
    })
  };
}

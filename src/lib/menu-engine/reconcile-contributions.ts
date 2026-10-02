import type { MenuPlanDish } from "@/lib/domain";

/** Retain whole-dish commitments only when that recipe remains on the menu. */
export function reconcileContributions(previous: MenuPlanDish[], selected: MenuPlanDish[]) {
  const byDish = new Map(previous.filter((item) => item.contributionGuestId).map((item) => [item.dish.id, item]));
  return selected.map((item) => {
    const commitment = byDish.get(item.dish.id);
    byDish.delete(item.dish.id);
    return {
      id: item.id,
      contributionGuestId: commitment?.contributionGuestId,
      contributionReady: Boolean(commitment?.contributionReady && item.servings <= commitment.servings)
    };
  });
}

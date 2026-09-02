import type {
  ClosestOverBudgetPlan,
  DinnerRoom,
  Dish,
  GeneratedPlan,
  Guest,
  HotpotRole,
  MenuGenerationResult,
  MenuPlanDish,
  NoSolutionIssue,
  PlanWarning
} from "@/lib/domain";
import { dishMatchesTerms, evaluateDishConstraints, evaluateDishForGuest } from "@/lib/menu-engine/constraints";
import { scoreDish } from "@/lib/menu-engine/score-dish";

type Candidate = GeneratedPlan & {
  key: string;
};

function scaledCost(dish: Dish, servings: number): number {
  return Math.round(dish.estimatedCostCents * (servings / dish.baseServings));
}

function servingsForDish(dish: Dish, guestCount: number, mainCount: number): number {
  if (dish.category === "MAIN") {
    return Math.max(2, Math.ceil(guestCount / mainCount));
  }

  if (dish.category === "DRINK" || dish.category === "DESSERT") {
    return guestCount;
  }

  return Math.max(guestCount, 4);
}

function servingsForHotpotDish(dish: Dish, guestCount: number, proteinCount: number): number {
  if (dish.hotpotRole === "PROTEIN") {
    return Math.max(1, Math.ceil(guestCount / proteinCount));
  }

  return Math.max(guestCount, 1);
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) {
    return [[]];
  }

  return items.flatMap((item, index) =>
    combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest])
  );
}

function adjustmentWarnings(dishes: Dish[], guests: Guest[]): PlanWarning[] {
  const warnings = dishes.flatMap((dish) =>
    evaluateDishConstraints(dish, guests).warnings.filter((warning) => warning.type === "SPICE_ADJUSTMENT")
  );
  const unique = new Map(warnings.map((warning) => [warning.message, warning]));
  return [...unique.values()];
}

function selectTopCandidates(candidates: Candidate[]): GeneratedPlan[] {
  const unique = new Map<string, Candidate>();
  for (const candidate of candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))) {
    if (!unique.has(candidate.key)) {
      unique.set(candidate.key, candidate);
    }
    if (unique.size >= 3) {
      break;
    }
  }

  return [...unique.values()].map((candidate) => ({
    title: candidate.title,
    summary: candidate.summary,
    score: candidate.score,
    estimatedCostCents: candidate.estimatedCostCents,
    warnings: candidate.warnings,
    dishes: candidate.dishes
  }));
}

function rememberClosestOverBudget(current: Candidate | undefined, candidate: Candidate): Candidate {
  if (!current) {
    return candidate;
  }
  if (candidate.estimatedCostCents !== current.estimatedCostCents) {
    return candidate.estimatedCostCents < current.estimatedCostCents ? candidate : current;
  }
  return candidate.score > current.score ? candidate : current;
}

function closestOverBudgetReference(candidate: Candidate | undefined, budgetCents?: number): ClosestOverBudgetPlan | undefined {
  if (!candidate || budgetCents === undefined) {
    return undefined;
  }
  return {
    title: candidate.title,
    estimatedCostCents: candidate.estimatedCostCents,
    budgetCents,
    overByCents: candidate.estimatedCostCents - budgetCents,
    dishNames: candidate.dishes.map((item) => item.dish.name)
  };
}

function noSolutionResult(
  room: DinnerRoom,
  issues: NoSolutionIssue[],
  closestOverBudget?: Candidate
): MenuGenerationResult {
  const closestOverBudgetPlan = closestOverBudgetReference(closestOverBudget, room.totalBudgetCents);
  return {
    kind: "no-solution",
    report: {
      eventType: room.eventType,
      summary: `No accepted ${room.eventType === "HOTPOT" ? "Hotpot" : "Dinner"} plan satisfies every hard rule yet.`,
      issues,
      ...(closestOverBudgetPlan ? { closestOverBudgetPlan } : {})
    }
  };
}

function generateDinnerPlans(input: { room: DinnerRoom; guests: Guest[]; dishes: Dish[] }): MenuGenerationResult {
  const { room, guests, dishes } = input;
  const eligible = dishes.filter(
    (dish) => dish.supportedEventTypes.includes("DINNER") && evaluateDishConstraints(dish, guests).allowed
  );
  const scored = eligible
    .map((dish) => scoreDish(dish, guests, room))
    .sort((a, b) => b.score - a.score || a.dish.id.localeCompare(b.dish.id));
  const scoreByDishId = new Map(scored.map((item) => [item.dish.id, item.score]));
  const safeGuestIdsByDishId = new Map(
    eligible.map((dish) => [
      dish.id,
      new Set(guests.filter((guest) => evaluateDishForGuest(dish, guest).safe).map((guest) => guest.id))
    ])
  );
  const likedGuestIdsByDishId = new Map(
    eligible.map((dish) => [
      dish.id,
      new Set(
        guests
          .filter((guest) => dishMatchesTerms(dish, guest.preference.likes).length > 0)
          .map((guest) => guest.id)
      )
    ])
  );
  const byCategory = (category: Dish["category"], limit: number) =>
    scored
      .filter(({ dish }) => dish.category === category)
      .slice(0, limit)
      .map(({ dish }) => dish);

  const mains = byCategory("MAIN", 6);
  const sides = byCategory("SIDE", 6);
  const desserts = byCategory("DESSERT", 3);
  const drinks = byCategory("DRINK", 3);
  const mainSets = [...combinations(mains, 1), ...combinations(mains, 2)];
  const sideSets = combinations(sides, 2);
  const dessertPool: Array<Dish | undefined> = [undefined, ...desserts];
  const guestCount = Math.max(room.expectedGuests ?? guests.length, guests.length, 1);
  const budget = room.totalBudgetCents ?? Number.POSITIVE_INFINITY;
  const candidates: Candidate[] = [];
  let closestOverBudget: Candidate | undefined;

  const coversEveryGuest = (candidateDishes: Dish[]) =>
    guests.every((guest) => {
      const safeMains = candidateDishes.some(
        (dish) => dish.category === "MAIN" && safeGuestIdsByDishId.get(dish.id)?.has(guest.id)
      );
      const safeSides = candidateDishes.some(
        (dish) => dish.category === "SIDE" && safeGuestIdsByDishId.get(dish.id)?.has(guest.id)
      );
      return safeMains && safeSides;
    });

  const scoreDinnerPlan = (candidateDishes: Dish[]) => {
    const averageDishScore =
      candidateDishes.reduce((sum, dish) => sum + (scoreByDishId.get(dish.id) ?? 0), 0) / candidateDishes.length;
    const likedGuestIds = new Set(
      candidateDishes.flatMap((dish) => [...(likedGuestIdsByDishId.get(dish.id) ?? new Set<string>())])
    );
    const dessertBonus = candidateDishes.some((dish) => dish.category === "DESSERT") ? 4 : 0;
    return Math.round(averageDishScore + 12 + dessertBonus + likedGuestIds.size * 4);
  };

  for (const selectedMains of mainSets) {
    for (const selectedSides of sideSets) {
      for (const drink of drinks) {
        for (const dessert of dessertPool) {
          const dishesForPlan = [...selectedMains, ...selectedSides, dessert, drink].filter(Boolean) as Dish[];
          if (!coversEveryGuest(dishesForPlan)) {
            continue;
          }

          const planDishes: MenuPlanDish[] = dishesForPlan.map((dish) => ({
            dish,
            servings: servingsForDish(dish, guestCount, selectedMains.length)
          }));
          const estimatedCostCents = planDishes.reduce((sum, item) => sum + scaledCost(item.dish, item.servings), 0);
          const key = dishesForPlan
            .map((dish) => dish.id)
            .sort()
            .join("|");
          const cuisines = [...new Set(selectedMains.map((dish) => dish.cuisine))];
          const title = cuisines.length === 1 ? `${cuisines[0]} Dinner Plan` : "Shared Dinner Plan";
          const candidate: Candidate = {
            key,
            title,
            summary: `Pairs ${selectedMains.map((dish) => dish.name.toLowerCase()).join(" and ")} with two shared sides.`,
            score: scoreDinnerPlan(dishesForPlan),
            estimatedCostCents,
            warnings: adjustmentWarnings(dishesForPlan, guests),
            dishes: planDishes
          };
          if (estimatedCostCents > budget) {
            closestOverBudget = rememberClosestOverBudget(closestOverBudget, candidate);
            continue;
          }

          candidates.push(candidate);
        }
      }
    }
  }

  const selected = selectTopCandidates(candidates);
  if (selected.length > 0) {
    return { kind: "success", plans: selected };
  }

  const allGuestNames = guests.map((guest) => guest.name);
  const issues: NoSolutionIssue[] = [];
  if (mains.length < 1) {
    issues.push({
      code: "MISSING_REQUIRED_DISH",
      message: "The safe Dinner catalog does not contain a main dish.",
      affectedGuestNames: allGuestNames
    });
  }
  if (sides.length < 2) {
    issues.push({
      code: "MISSING_REQUIRED_DISH",
      message: "The safe Dinner catalog needs at least two side dishes.",
      affectedGuestNames: allGuestNames
    });
  }
  if (drinks.length < 1) {
    issues.push({
      code: "MISSING_REQUIRED_DISH",
      message: "The safe Dinner catalog does not contain a drink.",
      affectedGuestNames: allGuestNames
    });
  }

  const uncoveredGuests = guests.filter((guest) => {
    const hasSafeMain = mains.some((dish) => safeGuestIdsByDishId.get(dish.id)?.has(guest.id));
    const hasSafeSide = sides.some((dish) => safeGuestIdsByDishId.get(dish.id)?.has(guest.id));
    return !hasSafeMain || !hasSafeSide;
  });
  if (uncoveredGuests.length > 0) {
    issues.push({
      code: "GUEST_COVERAGE",
      message: "At least one guest has no safe Dinner main or side in the current catalog.",
      affectedGuestNames: uncoveredGuests.map((guest) => guest.name)
    });
  }
  if (closestOverBudget && room.totalBudgetCents !== undefined) {
    issues.push({
      code: "BUDGET_LIMIT",
      message: `The least expensive complete Dinner plan is over budget by $${(
        (closestOverBudget.estimatedCostCents - room.totalBudgetCents) /
        100
      ).toFixed(2)}.`,
      affectedGuestNames: allGuestNames
    });
  }
  if (issues.length === 0) {
    issues.push({
      code: "GUEST_COVERAGE",
      message: "No Dinner combination satisfies every guest coverage rule at the same time.",
      affectedGuestNames: allGuestNames
    });
  }

  return noSolutionResult(room, issues, closestOverBudget);
}

function generateHotpotPlans(input: { room: DinnerRoom; guests: Guest[]; dishes: Dish[] }): MenuGenerationResult {
  const { room, guests, dishes } = input;
  const eligible = dishes.filter(
    (dish) =>
      dish.supportedEventTypes.includes("HOTPOT") &&
      dish.hotpotRole !== undefined &&
      evaluateDishConstraints(dish, guests).allowed
  );
  const scored = eligible
    .map((dish) => scoreDish(dish, guests, room))
    .sort((a, b) => b.score - a.score || a.dish.id.localeCompare(b.dish.id));
  const scoreByDishId = new Map(scored.map((item) => [item.dish.id, item.score]));
  const safeGuestIdsByDishId = new Map(
    eligible.map((dish) => [
      dish.id,
      new Set(guests.filter((guest) => evaluateDishForGuest(dish, guest).safe).map((guest) => guest.id))
    ])
  );
  const likedGuestIdsByDishId = new Map(
    eligible.map((dish) => [
      dish.id,
      new Set(
        guests
          .filter((guest) => dishMatchesTerms(dish, guest.preference.likes).length > 0)
          .map((guest) => guest.id)
      )
    ])
  );
  const byRole = (role: HotpotRole, limit: number) =>
    scored
      .filter(({ dish }) => dish.hotpotRole === role)
      .slice(0, limit)
      .map(({ dish }) => dish);

  const brothPool = byRole("BROTH", 3);
  const proteins = byRole("PROTEIN", 5);
  const vegetables = byRole("VEGETABLE", 4);
  const broths = brothPool.filter((broth) =>
    guests.every((guest) => safeGuestIdsByDishId.get(broth.id)?.has(guest.id))
  );
  const proteinSets = combinations(proteins, 2);
  const vegetableSets = combinations(vegetables, 2);
  const staples = byRole("STAPLE", 2);
  const sauces = byRole("SAUCE", 4);
  const sauceSets = combinations(sauces, 2);
  const drinks = byRole("DRINK", 3);
  const guestCount = Math.max(room.expectedGuests ?? guests.length, guests.length, 1);
  const budget = room.totalBudgetCents ?? Number.POSITIVE_INFINITY;
  const candidates: Candidate[] = [];
  let closestOverBudget: Candidate | undefined;

  const coversEveryGuest = (candidateDishes: Dish[]) =>
    guests.every((guest) => {
      const safeRoles = new Set(
        candidateDishes
          .filter((dish) => safeGuestIdsByDishId.get(dish.id)?.has(guest.id))
          .map((dish) => dish.hotpotRole)
      );
      return safeRoles.has("PROTEIN") && (safeRoles.has("VEGETABLE") || safeRoles.has("STAPLE"));
    });

  const scoreHotpotPlan = (candidateDishes: Dish[]) => {
    const averageDishScore =
      candidateDishes.reduce((sum, dish) => sum + (scoreByDishId.get(dish.id) ?? 0), 0) / candidateDishes.length;
    const likedGuestIds = new Set(
      candidateDishes.flatMap((dish) => [...(likedGuestIdsByDishId.get(dish.id) ?? new Set<string>())])
    );
    return Math.round(averageDishScore + 18 + likedGuestIds.size * 4);
  };

  for (const broth of broths) {
    for (const selectedProteins of proteinSets) {
      for (const selectedVegetables of vegetableSets) {
        for (const staple of staples) {
          for (const selectedSauces of sauceSets) {
            for (const drink of drinks) {
              const dishesForPlan = [
                broth,
                ...selectedProteins,
                ...selectedVegetables,
                staple,
                ...selectedSauces,
                drink
              ];
              if (!coversEveryGuest(dishesForPlan)) {
                continue;
              }

              const planDishes: MenuPlanDish[] = dishesForPlan.map((dish) => ({
                dish,
                servings: servingsForHotpotDish(dish, guestCount, selectedProteins.length)
              }));
              const estimatedCostCents = planDishes.reduce(
                (sum, item) => sum + scaledCost(item.dish, item.servings),
                0
              );
              const key = dishesForPlan
                .map((dish) => dish.id)
                .sort()
                .join("|");
              const candidate: Candidate = {
                key,
                title: `${broth.name} Hotpot Plan`,
                summary: `Pairs ${selectedProteins
                  .map((dish) => dish.name.toLowerCase())
                  .join(" and ")} with two vegetables, a staple, and shared dipping sauces.`,
                score: scoreHotpotPlan(dishesForPlan),
                estimatedCostCents,
                warnings: adjustmentWarnings(dishesForPlan, guests),
                dishes: planDishes
              };
              if (estimatedCostCents > budget) {
                closestOverBudget = rememberClosestOverBudget(closestOverBudget, candidate);
                continue;
              }

              candidates.push(candidate);
            }
          }
        }
      }
    }
  }

  const selected = selectTopCandidates(candidates);
  if (selected.length > 0) {
    return { kind: "success", plans: selected };
  }

  const allGuestNames = guests.map((guest) => guest.name);
  const issues: NoSolutionIssue[] = [];
  const eventBroths = dishes.filter(
    (dish) => dish.supportedEventTypes.includes("HOTPOT") && dish.hotpotRole === "BROTH"
  );
  if (eventBroths.length === 0) {
    issues.push({
      code: "MISSING_REQUIRED_DISH",
      message: "The Hotpot catalog does not contain a broth.",
      affectedGuestNames: allGuestNames
    });
  } else if (broths.length === 0) {
    const affectedGuests = guests.filter((guest) =>
      eventBroths.some((broth) => !evaluateDishForGuest(broth, guest).safe)
    );
    issues.push({
      code: "UNSAFE_SHARED_BROTH",
      message: "No shared broth is safe for every guest.",
      affectedGuestNames:
        affectedGuests.length > 0 ? affectedGuests.map((guest) => guest.name) : allGuestNames
    });
  }

  const roleRequirements: Array<{ label: string; count: number; required: number }> = [
    { label: "protein", count: proteins.length, required: 2 },
    { label: "vegetable", count: vegetables.length, required: 2 },
    { label: "staple", count: staples.length, required: 1 },
    { label: "sauce", count: sauces.length, required: 2 },
    { label: "drink", count: drinks.length, required: 1 }
  ];
  for (const role of roleRequirements.filter((item) => item.count < item.required)) {
    issues.push({
      code: "MISSING_REQUIRED_DISH",
      message: `The safe Hotpot catalog needs ${role.required} ${role.label}${role.required === 1 ? "" : "s"}.`,
      affectedGuestNames: allGuestNames
    });
  }

  const uncoveredGuests = guests.filter((guest) => {
    const hasSafeProtein = proteins.some((dish) => safeGuestIdsByDishId.get(dish.id)?.has(guest.id));
    const hasSafeVegetableOrStaple = [...vegetables, ...staples].some((dish) =>
      safeGuestIdsByDishId.get(dish.id)?.has(guest.id)
    );
    return !hasSafeProtein || !hasSafeVegetableOrStaple;
  });
  if (uncoveredGuests.length > 0) {
    issues.push({
      code: "GUEST_COVERAGE",
      message: "At least one guest has no safe Hotpot protein or vegetable/staple option.",
      affectedGuestNames: uncoveredGuests.map((guest) => guest.name)
    });
  }
  if (closestOverBudget && room.totalBudgetCents !== undefined) {
    issues.push({
      code: "BUDGET_LIMIT",
      message: `The least expensive complete Hotpot plan is over budget by $${(
        (closestOverBudget.estimatedCostCents - room.totalBudgetCents) /
        100
      ).toFixed(2)}.`,
      affectedGuestNames: allGuestNames
    });
  }
  if (issues.length === 0) {
    issues.push({
      code: "GUEST_COVERAGE",
      message: "No Hotpot combination satisfies every structural and guest coverage rule at the same time.",
      affectedGuestNames: allGuestNames
    });
  }

  return noSolutionResult(room, issues, closestOverBudget);
}

export function generateMenuPlans(input: { room: DinnerRoom; guests: Guest[]; dishes: Dish[] }): MenuGenerationResult {
  const { room } = input;
  if (room.eventType === "DINNER") {
    return generateDinnerPlans(input);
  }

  if (room.eventType === "HOTPOT") {
    return generateHotpotPlans(input);
  }

  return {
    kind: "no-solution",
    report: {
      eventType: room.eventType,
      summary: "This event type does not have an accepted core menu generator.",
      issues: [
        {
          code: "UNSUPPORTED_EVENT",
          message: "Choose Dinner or Hotpot to use the current core planning workflow.",
          affectedGuestNames: []
        }
      ]
    }
  };
}

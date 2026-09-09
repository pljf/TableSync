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
import { eventFormatLabel, eventFormats } from "@/lib/event-formats";
import { dietViolation, dishMatchesTerms, evaluateDishConstraints, evaluateDishForGuest } from "@/lib/menu-engine/constraints";
import { scoreDish } from "@/lib/menu-engine/score-dish";

type Candidate = GeneratedPlan & {
  key: string;
};

function scaledCost(dish: Dish, servings: number): number {
  return Math.round(dish.estimatedCostCents * (servings / dish.baseServings));
}

function servingsForDish(dish: Dish, guestCount: number): number {
  if (dish.category === "DRINK" || dish.category === "DESSERT") {
    return guestCount;
  }

  return Math.max(guestCount, 4);
}

function mainServings(
  dishes: Dish[],
  guests: Guest[],
  guestCount: number,
  safeGuestIdsByDishId: Map<string, Set<string>>,
  minimum: number
): Map<string, number> {
  const portions = new Map(dishes.map((dish) => [dish.id, (guestCount - guests.length) / dishes.length]));
  for (const guest of guests) {
    const safeDishes = dishes.filter((dish) => safeGuestIdsByDishId.get(dish.id)?.has(guest.id));
    for (const dish of safeDishes) {
      portions.set(dish.id, (portions.get(dish.id) ?? 0) + 1 / safeDishes.length);
    }
  }
  return new Map([...portions].map(([dishId, servings]) => [dishId, Math.max(minimum, Math.ceil(servings))]));
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) {
    return [[]];
  }

  return items.flatMap((item, index) =>
    combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest])
  );
}

function adjustmentWarnings(dishes: Dish[], warningsByDishId: Map<string, PlanWarning[]>): PlanWarning[] {
  const warnings = dishes.flatMap((dish) => warningsByDishId.get(dish.id) ?? []);
  const unique = new Map(warnings.map((warning) => [warning.message, warning]));
  return [...unique.values()];
}

function candidateFamilyKey(candidate: Candidate): string {
  return candidate.dishes
    .map(({ dish }) => dish)
    .filter((dish) => dish.category !== "DRINK" && dish.hotpotRole !== "SAUCE")
    .map((dish) => dish.id)
    .sort()
    .join("|");
}

function selectTopCandidates(candidates: Candidate[]): GeneratedPlan[] {
  const ranked = candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const selected = new Map<string, Candidate>();
  const selectedFamilies = new Set<string>();
  const diversityFloor = (ranked[0]?.score ?? 0) - 10;

  for (const candidate of ranked) {
    if (candidate.score < diversityFloor) {
      break;
    }
    const familyKey = candidateFamilyKey(candidate);
    if (!selectedFamilies.has(familyKey)) {
      selected.set(candidate.key, candidate);
      selectedFamilies.add(familyKey);
    }
    if (selected.size >= 3) {
      break;
    }
  }

  for (const candidate of ranked) {
    if (!selected.has(candidate.key)) {
      selected.set(candidate.key, candidate);
    }
    if (selected.size >= 3) {
      break;
    }
  }

  return [...selected.values()].map((candidate) => ({
    title: candidate.title,
    summary: candidate.summary,
    score: candidate.score,
    estimatedCostCents: candidate.estimatedCostCents,
    warnings: candidate.warnings,
    dishes: candidate.dishes
  }));
}

function hotpotDishLabel(name: string): string {
  return name
    .replace(/^hotpot\s+/i, "")
    .replace(/\s+hotpot broth$/i, " broth")
    .replace(/\s+(platter|slices)$/i, "")
    .toLowerCase();
}

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
      summary: `No accepted ${eventFormatLabel(room.eventType)} plan satisfies every hard rule yet.`,
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
  const warningsByDishId = new Map(eligible.map((dish) => [
    dish.id,
    evaluateDishConstraints(dish, guests).warnings.filter((warning) => warning.type === "SPICE_ADJUSTMENT")
  ]));
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
  const byCategory = (category: Dish["category"]) =>
    scored
      .filter(({ dish }) => dish.category === category)
      .map(({ dish }) => dish);

  const mains = byCategory("MAIN");
  const sides = byCategory("SIDE");
  const desserts = byCategory("DESSERT");
  const drinks = byCategory("DRINK");
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
    const servingsByMain = mainServings(selectedMains, guests, guestCount, safeGuestIdsByDishId, 2);
    for (const selectedSides of sideSets) {
      for (const drink of drinks) {
        for (const dessert of dessertPool) {
          const dishesForPlan = [...selectedMains, ...selectedSides, dessert, drink].filter(Boolean) as Dish[];
          if (!coversEveryGuest(dishesForPlan)) {
            continue;
          }

          const planDishes: MenuPlanDish[] = dishesForPlan.map((dish) => ({
            dish,
            servings: servingsByMain.get(dish.id) ?? servingsForDish(dish, guestCount)
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
            warnings: adjustmentWarnings(dishesForPlan, warningsByDishId),
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

function generateStructuredPlans(input: { room: DinnerRoom; guests: Guest[]; dishes: Dish[] }): MenuGenerationResult {
  const { room, guests, dishes } = input;
  const format = eventFormats[room.eventType];
  const slots = format.slots ?? [];
  const eligible = dishes.filter((dish) =>
    dish.supportedEventTypes.includes(room.eventType) && evaluateDishConstraints(dish, guests).allowed
  );
  const scored = eligible.map((dish) => scoreDish(dish, guests, room));
  const scoreByDishId = new Map(scored.map((item) => [item.dish.id, item.score]));
  const warningsByDishId = new Map(eligible.map((dish) => [
    dish.id,
    evaluateDishConstraints(dish, guests).warnings.filter((warning) => warning.type === "SPICE_ADJUSTMENT")
  ]));
  const safeGuestIdsByDishId = new Map(eligible.map((dish) => [
    dish.id,
    new Set(guests.filter((guest) => evaluateDishForGuest(dish, guest).safe).map((guest) => guest.id))
  ]));
  const likedGuestIdsByDishId = new Map(eligible.map((dish) => [
    dish.id,
    guests.filter((guest) => dishMatchesTerms(dish, guest.preference.likes).length > 0).map((guest) => guest.id)
  ]));
  const pools = slots.map((slot) => eligible
    .filter((dish) => dish.category === slot.category && (!slot.requiredTag || dish.tags.includes(slot.requiredTag)))
    .sort((a, b) => a.id.localeCompare(b.id)));
  const choices = slots.map((slot, index) => Array.from(
    { length: slot.max - slot.min + 1 }, (_, offset) => combinations(pools[index], slot.min + offset)
  ).flat());
  const guestCount = Math.max(room.expectedGuests ?? guests.length, guests.length, 1);
  const budget = room.totalBudgetCents ?? Number.POSITIVE_INFINITY;
  const candidates: Candidate[] = [];
  let closestOverBudget: Candidate | undefined;

  const plantBased = (dish: Dish) => dish.tags.includes("vegan") && dietViolation(dish, "VEGAN") === null;
  const coversEveryGuest = (selection: Dish[]) => guests.every((guest) =>
    ["MAIN", "SIDE"].every((category) => selection.some((dish) =>
      dish.category === category && safeGuestIdsByDishId.get(dish.id)?.has(guest.id)
    ))
  );

  // Enumerate the actual format slots; never relax structure or guest coverage to fit a budget.
  const assemble = (slotIndex: number, selection: Dish[]) => {
    if (slotIndex < choices.length) {
      for (const choice of choices[slotIndex]) {
        if (choice.some((dish) => selection.some((selected) => selected.id === dish.id))) continue;
        assemble(slotIndex + 1, [...selection, ...choice]);
      }
      return;
    }
    const mains = selection.filter((dish) => dish.category === "MAIN");
    if (format.requiresPlantBasedMain && !mains.some(plantBased)) return;
    if (!coversEveryGuest(selection)) return;

    const servingsByMain = mainServings(mains, guests, guestCount, safeGuestIdsByDishId, 1);
    const planDishes = selection.map((dish) => ({ dish, servings: servingsByMain.get(dish.id) ?? guestCount }));
    const estimatedCostCents = planDishes.reduce((sum, item) => sum + scaledCost(item.dish, item.servings), 0);
    const likedGuests = new Set(selection.flatMap((dish) => likedGuestIdsByDishId.get(dish.id) ?? []));
    const averageScore = selection.reduce((sum, dish) => sum + (scoreByDishId.get(dish.id) ?? 0), 0) / selection.length;
    const candidate: Candidate = {
      key: selection.map((dish) => dish.id).sort().join("|"),
      title: `${format.label === "Other" ? "Shared buffet" : format.label}: ${mains.map((dish) => dish.name.toLowerCase()).join(" + ")}`,
      summary: `${format.structure} Features ${mains.map((dish) => dish.name.toLowerCase()).join(" and ")}.`,
      score: Math.round(averageScore + 16 + likedGuests.size * 4),
      estimatedCostCents,
      warnings: adjustmentWarnings(selection, warningsByDishId),
      dishes: planDishes
    };
    if (estimatedCostCents > budget) {
      closestOverBudget = rememberClosestOverBudget(closestOverBudget, candidate);
    } else {
      candidates.push(candidate);
    }
  };
  assemble(0, []);
  const selected = selectTopCandidates(candidates);
  if (selected.length > 0) {
    // When the mains match, name the differing accompaniments so options remain easy to compare.
    const titledPlans = selected.map((plan) => {
      const peers = selected.filter((other) => other.title === plan.title);
      if (peers.length === 1) return plan;
      const differences = plan.dishes.filter(({ dish }) =>
        !peers.every((peer) => peer.dishes.some((item) => item.dish.id === dish.id))
      );
      return {
        ...plan,
        title: `${format.label === "Other" ? "Shared buffet" : format.label}: ${differences.map(({ dish }) => dish.name.toLowerCase()).join(" + ")}`
      };
    });
    return { kind: "success", plans: titledPlans };
  }

  const allGuestNames = guests.map((guest) => guest.name);
  const issues: NoSolutionIssue[] = [];
  slots.forEach((slot, index) => {
    if (pools[index].length < slot.min) {
      issues.push({
        code: "MISSING_REQUIRED_DISH",
        message: `The safe ${format.label} catalog needs ${slot.min} ${slot.label}${slot.min === 1 ? "" : "s"}.`,
        affectedGuestNames: allGuestNames
      });
    }
  });
  const mains = pools.flat().filter((dish) => dish.category === "MAIN");
  const sides = pools.flat().filter((dish) => dish.category === "SIDE");
  if (format.requiresPlantBasedMain && !mains.some(plantBased)) {
    issues.push({
      code: "MISSING_REQUIRED_DISH",
      message: `The safe ${format.label} catalog needs a plant-based grilled main.`,
      affectedGuestNames: allGuestNames
    });
  }
  const uncoveredGuests = guests.filter((guest) =>
    !mains.some((dish) => safeGuestIdsByDishId.get(dish.id)?.has(guest.id)) ||
    !sides.some((dish) => safeGuestIdsByDishId.get(dish.id)?.has(guest.id))
  );
  if (uncoveredGuests.length > 0) {
    issues.push({
      code: "GUEST_COVERAGE",
      message: `At least one guest has no safe ${format.label} main or side in the current catalog.`,
      affectedGuestNames: uncoveredGuests.map((guest) => guest.name)
    });
  }
  if (closestOverBudget && room.totalBudgetCents !== undefined) {
    issues.push({
      code: "BUDGET_LIMIT",
      message: `The least expensive complete ${format.label} plan is over budget by $${((closestOverBudget.estimatedCostCents - room.totalBudgetCents) / 100).toFixed(2)}.`,
      affectedGuestNames: allGuestNames
    });
  }
  if (issues.length === 0) {
    issues.push({
      code: "GUEST_COVERAGE",
      message: `No ${format.label} combination satisfies every structural and guest coverage rule at the same time.`,
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
  const warningsByDishId = new Map(eligible.map((dish) => [
    dish.id,
    evaluateDishConstraints(dish, guests).warnings.filter((warning) => warning.type === "SPICE_ADJUSTMENT")
  ]));
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
  const byRole = (role: HotpotRole) =>
    scored
      .filter(({ dish }) => dish.hotpotRole === role)
      .map(({ dish }) => dish);

  const brothPool = byRole("BROTH");
  const proteins = byRole("PROTEIN");
  const vegetables = byRole("VEGETABLE");
  const broths = brothPool.filter((broth) =>
    guests.every((guest) => safeGuestIdsByDishId.get(broth.id)?.has(guest.id))
  );
  const proteinSets = combinations(proteins, 2);
  const vegetableSets = combinations(vegetables, 2);
  const staples = byRole("STAPLE");
  const sauces = byRole("SAUCE");
  const sauceSets = combinations(sauces, 2);
  const drinks = byRole("DRINK");
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
      const servingsByProtein = mainServings(selectedProteins, guests, guestCount, safeGuestIdsByDishId, 1);
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
                servings: servingsByProtein.get(dish.id) ?? guestCount
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
                title: sentenceCase(
                  `${hotpotDishLabel(broth.name)} · ${selectedProteins
                    .map((dish) => hotpotDishLabel(dish.name))
                    .join(" + ")} with ${selectedVegetables
                    .map((dish) => hotpotDishLabel(dish.name))
                    .join(" + ")}`
                ),
                summary: `Pairs ${selectedProteins
                  .map((dish) => dish.name.toLowerCase())
                  .join(" and ")} with two vegetables, a staple, and shared dipping sauces.`,
                score: scoreHotpotPlan(dishesForPlan),
                estimatedCostCents,
                warnings: adjustmentWarnings(dishesForPlan, warningsByDishId),
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

  if (eventFormats[room.eventType]?.slots) {
    return generateStructuredPlans(input);
  }

  return {
    kind: "no-solution",
    report: {
      eventType: room.eventType,
      summary: "This event type does not have an accepted core menu generator.",
      issues: [
        {
          code: "UNSUPPORTED_EVENT",
          message: "Choose Dinner, Hotpot, Potluck, BBQ, Picnic, Brunch, or Other to use the planning workflow.",
          affectedGuestNames: []
        }
      ]
    }
  };
}

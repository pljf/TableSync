import type { DietType, Dish, Guest, PlanWarning, SpiceLevel } from "@/lib/domain";

const spiceRank: Record<SpiceLevel, number> = {
  NONE: 0,
  MILD: 1,
  MEDIUM: 2,
  HOT: 3
};

const meatTags = new Set(["meat", "beef", "chicken", "pork"]);
const seafoodTags = new Set(["seafood", "fish", "shellfish", "shrimp"]);
const animalProductTags = new Set(["meat", "beef", "chicken", "pork", "seafood", "fish", "shellfish", "dairy", "egg", "honey"]);

export function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

export function dishSearchTerms(dish: Dish): string[] {
  return [
    dish.name,
    dish.description ?? "",
    dish.cuisine,
    ...dish.tags,
    ...dish.ingredients.flatMap(({ ingredient }) => [ingredient.name, ...ingredient.tags])
  ]
    .map(normalizeTerm)
    .filter(Boolean);
}

export function dishMatchesTerms(dish: Dish, terms: string[]): string[] {
  const normalizedTerms = terms.map(normalizeTerm).filter(Boolean);
  if (normalizedTerms.length === 0) {
    return [];
  }

  const haystack = dishSearchTerms(dish);
  return normalizedTerms.filter((term) => haystack.some((entry) => entry.includes(term) || term.includes(entry)));
}

function hasAnyTag(dish: Dish, tags: Set<string>): boolean {
  const dishTags = dishSearchTerms(dish);
  return dishTags.some((tag) => tags.has(tag));
}

export function dietViolation(dish: Dish, dietType: DietType): string | null {
  if (dietType === "OMNIVORE") {
    return null;
  }

  if (dietType === "VEGETARIAN" && (hasAnyTag(dish, meatTags) || hasAnyTag(dish, seafoodTags))) {
    return "contains meat or seafood";
  }

  if (dietType === "VEGAN" && hasAnyTag(dish, animalProductTags)) {
    return "contains animal products";
  }

  if (dietType === "PESCATARIAN" && hasAnyTag(dish, meatTags)) {
    return "contains non-seafood meat";
  }

  if ((dietType === "HALAL" || dietType === "KOSHER") && dishMatchesTerms(dish, ["pork"]).length > 0) {
    return "contains pork";
  }

  if (dietType === "KOSHER" && dishMatchesTerms(dish, ["shellfish", "shrimp"]).length > 0) {
    return "contains shellfish";
  }

  if (dietType === "GLUTEN_FREE" && !dish.tags.includes("gluten-free") && dishMatchesTerms(dish, ["gluten", "wheat"]).length > 0) {
    return "contains gluten";
  }

  return null;
}

export type ConstraintResult = {
  allowed: boolean;
  warnings: PlanWarning[];
  blockedBy: string[];
  spicePenalty: number;
};

export function evaluateDishConstraints(dish: Dish, guests: Guest[]): ConstraintResult {
  const warnings: PlanWarning[] = [];
  const blockedBy: string[] = [];
  let spicePenalty = 0;

  for (const guest of guests) {
    const allergyMatches = dishMatchesTerms(dish, guest.preference.allergies);
    if (allergyMatches.length > 0) {
      blockedBy.push(guest.name);
      warnings.push({
        type: "ALLERGY_CONFLICT",
        message: `${dish.name} conflicts with ${guest.name}'s allergy: ${allergyMatches.join(", ")}.`,
        affectedGuestNames: [guest.name]
      });
      continue;
    }

    const dietIssue = dietViolation(dish, guest.preference.dietType);
    if (dietIssue) {
      blockedBy.push(guest.name);
      warnings.push({
        type: "DIET_CONFLICT",
        message: `${dish.name} ${dietIssue}, which conflicts with ${guest.name}'s diet.`,
        affectedGuestNames: [guest.name]
      });
      continue;
    }

    const spiceGap = spiceRank[dish.spiceLevel] - spiceRank[guest.preference.spiceLevel];
    if (spiceGap >= 2) {
      blockedBy.push(guest.name);
      warnings.push({
        type: "SPICE_CONFLICT",
        message: `${dish.name} is much spicier than ${guest.name}'s tolerance.`,
        affectedGuestNames: [guest.name]
      });
      continue;
    }

    if (spiceGap === 1) {
      spicePenalty += 5;
    }
  }

  return {
    allowed: blockedBy.length === 0,
    warnings,
    blockedBy,
    spicePenalty
  };
}


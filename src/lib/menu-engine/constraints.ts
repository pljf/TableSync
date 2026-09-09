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
  const normalizedTerms = [...new Set(terms.map(normalizeTerm).filter(Boolean))];
  if (normalizedTerms.length === 0) {
    return [];
  }

  const haystack = dishSearchTerms(dish);
  return normalizedTerms.filter((term) => haystack.some((entry) => entry.includes(term) || term.includes(entry)));
}

const allergenAliases: Record<string, string> = {
  dairy: "milk",
  eggs: "egg",
  peanuts: "peanut",
  nuts: "nut",
  soya: "soy",
  soybean: "soy",
  soybeans: "soy"
};

const allergenFamilies = new Set([
  "milk", "egg", "peanut", "nut", "soy", "sesame", "shellfish", "fish", "gluten", "wheat", "barley", "rye"
]);

function allergenWords(value: string): string {
  return normalizeTerm(value)
    // Absence labels are not evidence that an allergen is present.
    .replace(/\b(?:gluten|wheat|dairy|milk|egg|soy|peanut|nut|sesame|shellfish)[- ]free\b/g, " ")
    .replace(/\b(coconut|almond|soy|oat|rice) milk\b/g, "$1")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => {
      if (allergenAliases[word]) return allergenAliases[word];
      if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
      if (word.endsWith("oes")) return word.slice(0, -2);
      if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
      return word;
    })
    .join(" ");
}

export function dishMatchesAllergens(dish: Dish, terms: string[]): string[] {
  const haystack = dishSearchTerms(dish).map((term) => ` ${allergenWords(term)} `);
  return [...new Set(terms.map(normalizeTerm).filter(Boolean))].filter((term) => {
    const words = allergenWords(term);
    // Guests can qualify an allergen ("sesame seeds", "milk allergy").
    // Match those families as whole words, without treating coconut as nut or milk.
    const families = words.split(" ").filter((word) => allergenFamilies.has(word));
    const ingredientWords = words.replace(/\b(?:allergy|product)\b/g, " ").replace(/\s+/g, " ").trim();
    const searchTerms = families.length > 0 ? families : [ingredientWords];
    return searchTerms.some((searchTerm) =>
      searchTerm.length > 0 && haystack.some((entry) => entry.includes(` ${searchTerm} `))
    );
  });
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

  if (dietType === "GLUTEN_FREE" && dishMatchesAllergens(dish, ["gluten", "wheat", "barley", "rye"]).length > 0) {
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

export type DishGuestSafety = {
  guestId: string;
  guestName: string;
  safe: boolean;
  allergyMatches: string[];
  dietIssue: string | null;
  spiceGap: number;
  requiresSpiceAdjustment: boolean;
};

export type GuestPlanCoverage = {
  guestId: string;
  guestName: string;
  safeMainDishIds: string[];
  safeSideDishIds: string[];
  hasSafeMain: boolean;
  hasSafeSide: boolean;
  covered: boolean;
};

export function evaluateDishForGuest(dish: Dish, guest: Guest): DishGuestSafety {
  const allergyMatches = dishMatchesAllergens(dish, guest.preference.allergies);
  const dietIssue = dietViolation(dish, guest.preference.dietType);
  const spiceGap = Math.max(0, spiceRank[dish.spiceLevel] - spiceRank[guest.preference.spiceLevel]);
  const requiresSpiceAdjustment =
    allergyMatches.length === 0 && dietIssue === null && spiceGap > 0 && dish.spiceAdjustable;
  const intrinsicSpiceConflict = spiceGap > 0 && !dish.spiceAdjustable;

  return {
    guestId: guest.id,
    guestName: guest.name,
    safe: allergyMatches.length === 0 && dietIssue === null && !intrinsicSpiceConflict,
    allergyMatches,
    dietIssue,
    spiceGap,
    requiresSpiceAdjustment
  };
}

export function evaluatePlanCoverage(dishes: Dish[], guests: Guest[]): GuestPlanCoverage[] {
  return guests.map((guest) => {
    const safeDishes = dishes.filter((dish) => evaluateDishForGuest(dish, guest).safe);
    const safeMainDishIds = safeDishes.filter((dish) => dish.category === "MAIN").map((dish) => dish.id);
    const safeSideDishIds = safeDishes.filter((dish) => dish.category === "SIDE").map((dish) => dish.id);
    const hasSafeMain = safeMainDishIds.length > 0;
    const hasSafeSide = safeSideDishIds.length > 0;

    return {
      guestId: guest.id,
      guestName: guest.name,
      safeMainDishIds,
      safeSideDishIds,
      hasSafeMain,
      hasSafeSide,
      covered: hasSafeMain && hasSafeSide
    };
  });
}

export function evaluateDishConstraints(dish: Dish, guests: Guest[]): ConstraintResult {
  const warnings: PlanWarning[] = [];
  const blockedBy: string[] = [];
  let spicePenalty = 0;

  const safetyResults = guests.map((guest) => evaluateDishForGuest(dish, guest));

  for (const safety of safetyResults) {
    if (safety.allergyMatches.length > 0) {
      blockedBy.push(safety.guestName);
      warnings.push({
        type: "ALLERGY_CONFLICT",
        message: `${dish.name} conflicts with ${safety.guestName}'s allergy: ${safety.allergyMatches.join(", ")}.`,
        affectedGuestNames: [safety.guestName]
      });
      continue;
    }

    if (safety.dietIssue) {
      blockedBy.push(safety.guestName);
      warnings.push({
        type: "DIET_CONFLICT",
        message: `${dish.name} ${safety.dietIssue}, which conflicts with ${safety.guestName}'s diet.`,
        affectedGuestNames: [safety.guestName]
      });
      continue;
    }

    if (safety.spiceGap > 0 && !safety.requiresSpiceAdjustment) {
      blockedBy.push(safety.guestName);
      warnings.push({
        type: "SPICE_CONFLICT",
        message: `${dish.name} is spicier than ${safety.guestName}'s tolerance.`,
        affectedGuestNames: [safety.guestName]
      });
      continue;
    }

    if (safety.requiresSpiceAdjustment) {
      spicePenalty += safety.spiceGap * 3;
      warnings.push({
        type: "SPICE_ADJUSTMENT",
        message: `Serve the spicy components of ${dish.name} separately for ${safety.guestName}.`,
        affectedGuestNames: [safety.guestName]
      });
    }
  }

  const hasGlobalAllergyConflict = safetyResults.some((result) => result.allergyMatches.length > 0);
  const hasEligibleGuest = safetyResults.length === 0 || safetyResults.some((result) => result.safe);

  return {
    allowed: !hasGlobalAllergyConflict && hasEligibleGuest,
    warnings,
    blockedBy: [...new Set(blockedBy)],
    spicePenalty
  };
}


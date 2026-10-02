import type { Dish, EventType, MenuPlan } from "@/lib/domain";
import { dishCatalog } from "@/lib/seed-data";
import { cookingGuides } from "./catalog";
import { cookingSafetySources } from "./references";
import type { CookingGuide, CookingPhase } from "./types";

const originals = new Map(dishCatalog.map((dish) => [dish.id, dish]));

function recipeIdentity(dish: Dish): string {
  return JSON.stringify([dish.name, dish.baseServings, dish.ingredients.map(({ ingredient, quantity, unit }) =>
    [ingredient.id, ingredient.name, quantity, unit]
  ).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
}

/** Do not apply a built-in recipe to a personal or edited dish sharing its ID. */
export function cookingGuideFor(dish: Dish): CookingGuide | null {
  const original = originals.get(dish.id);
  if (!original || !Object.hasOwn(cookingGuides, dish.id) || recipeIdentity(dish) !== recipeIdentity(original)) return null;
  const guide = cookingGuides[dish.id];
  const expected = [...guide.ingredientIds].sort().join("|");
  return expected === dish.ingredients.map(({ ingredient }) => ingredient.id).sort().join("|") ? guide : null;
}

export function cookingOrder(plan: MenuPlan, eventType: EventType) {
  if (plan.status !== "FINALIZED") return [];
  const phases: CookingPhase[] = ["START", "COOK", "FINISH"];
  return phases.map((phase) => ({
    phase,
    tasks: plan.dishes
      .filter((item) => !(eventType === "POTLUCK" && item.contributionGuestId))
      .map((item) => ({ item, guide: cookingGuideFor(item.dish) }))
      .filter(({ guide }) => (guide?.phase ?? "START") === phase)
      .sort((a, b) => b.item.dish.prepTimeMinutes - a.item.dish.prepTimeMinutes || a.item.dish.id.localeCompare(b.item.dish.id))
      .map(({ item, guide }) => ({ item, task: guide?.task ?? "Find this dish's recipe instructions before starting." }))
  })).filter(({ tasks }) => tasks.length > 0);
}

export function cookingSafetyNotes(plan: MenuPlan, eventType: EventType) {
  const ingredients = new Set(plan.dishes.flatMap(({ dish }) => dish.ingredients.map(({ ingredient }) => ingredient.id)));
  const notes: { text: string; url: string }[] = [
    { text: "Keep raw food separate from cooked food and use clean hands, boards and utensils. Keep cold food at 4°C / 40°F or below and hot food at 60°C / 140°F or above.", url: cookingSafetySources.handling },
    { text: "Refrigerate perishable food within 2 hours, or 1 hour above 32°C / 90°F. Cool cooked grains and other leftovers promptly in shallow containers.", url: cookingSafetySources.handling }
  ];
  if (ingredients.has("chicken")) notes.push({ text: "Cook chicken to 74°C / 165°F using a food thermometer; color and a suggested cooking time are not safety checks.", url: cookingSafetySources.temperature });
  if (ingredients.has("beef")) notes.push({ text: "Whole-cut beef: 63°C / 145°F plus a 3-minute rest. Ground beef: 71°C / 160°F. Confirm the cut you bought and check with a thermometer.", url: cookingSafetySources.temperature });
  if (ingredients.has("salmon")) notes.push({ text: "Cook fish to 63°C / 145°F in the thickest part.", url: cookingSafetySources.temperature });
  if (ingredients.has("shrimp")) notes.push({ text: "Cook shrimp until the flesh is pearly or white and opaque throughout.", url: cookingSafetySources.temperature });
  notes.push({ text: "Cook casseroles and reheated leftovers to 74°C / 165°F using a food thermometer.", url: cookingSafetySources.temperature });
  if (ingredients.has("eggs")) notes.push({ text: "Cook egg dishes to 71°C / 160°F using a food thermometer.", url: cookingSafetySources.temperature });
  if (eventType === "HOTPOT") notes.push({ text: "Use separate raw-food and serving utensils, let the broth return to a simmer between small batches, and check each protein's safe temperature. A brief dip is not a safety guarantee.", url: cookingSafetySources.handling });
  if (eventType === "PICNIC") notes.push({ text: "Transport perishable dishes and cut fruit in an insulated cooler with ice packs; keep them cold until serving.", url: cookingSafetySources.picnic });
  return notes;
}

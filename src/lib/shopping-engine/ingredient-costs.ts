import type { Dish, DishIngredient } from "@/lib/domain";

// Authored, indicative USD costs per recipe unit, used only as allocation
// weights. They are not live store prices or full-package checkout estimates.
const referenceUnitCosts: Record<string, { unit: string; cents: number }> = {
  rice: { unit: "cup", cents: 50 },
  "brown-rice": { unit: "cup", cents: 65 },
  "wheat-pasta": { unit: "lb", cents: 200 },
  "gluten-free-pasta": { unit: "lb", cents: 350 },
  tortillas: { unit: "pack", cents: 300 },
  "corn-tortillas": { unit: "pack", cents: 250 },
  "tortilla-chips": { unit: "bag", cents: 350 },
  chicken: { unit: "lb", cents: 400 },
  beef: { unit: "lb", cents: 650 },
  pork: { unit: "lb", cents: 400 },
  salmon: { unit: "lb", cents: 1000 },
  shrimp: { unit: "lb", cents: 800 },
  tofu: { unit: "block", cents: 250 },
  chickpeas: { unit: "can", cents: 125 },
  "black-beans": { unit: "can", cents: 125 },
  lentils: { unit: "cup", cents: 75 },
  quinoa: { unit: "cup", cents: 150 },
  "certified-oats": { unit: "cup", cents: 75 },
  "olive-oil": { unit: "tbsp", cents: 25 },
  potatoes: { unit: "lb", cents: 100 },
  corn: { unit: "each", cents: 75 },
  lemon: { unit: "each", cents: 65 },
  "fresh-herbs": { unit: "bunch", cents: 150 },
  apples: { unit: "each", cents: 75 },
  oranges: { unit: "each", cents: 75 },
  grapes: { unit: "lb", cents: 250 },
  eggs: { unit: "each", cents: 35 },
  mushrooms: { unit: "lb", cents: 400 },
  cabbage: { unit: "head", cents: 250 },
  "bok-choy": { unit: "bunch", cents: 200 },
  spinach: { unit: "bag", cents: 300 },
  cucumber: { unit: "each", cents: 75 },
  tomato: { unit: "lb", cents: 200 },
  onion: { unit: "each", cents: 65 },
  "bell-pepper": { unit: "each", cents: 100 },
  carrot: { unit: "lb", cents: 100 },
  broccoli: { unit: "lb", cents: 200 },
  avocado: { unit: "each", cents: 150 },
  fruit: { unit: "lb", cents: 250 },
  garlic: { unit: "head", cents: 60 },
  ginger: { unit: "oz", cents: 30 },
  cheese: { unit: "lb", cents: 500 },
  mozzarella: { unit: "lb", cents: 500 },
  yogurt: { unit: "cup", cents: 100 },
  "ice-cream": { unit: "pint", cents: 350 },
  "coconut-milk": { unit: "can", cents: 200 },
  bread: { unit: "loaf", cents: 300 },
  "brownie-mix": { unit: "box", cents: 250 },
  mochi: { unit: "box", cents: 500 },
  "peanut-sauce": { unit: "jar", cents: 350 },
  "soy-sauce": { unit: "bottle", cents: 250 },
  tamari: { unit: "bottle", cents: 400 },
  "sesame-oil": { unit: "bottle", cents: 500 },
  kimchi: { unit: "jar", cents: 500 },
  broth: { unit: "carton", cents: 200 },
  gochujang: { unit: "jar", cents: 400 },
  "curry-paste": { unit: "jar", cents: 350 },
  hummus: { unit: "tub", cents: 300 },
  "sparkling-water": { unit: "case", cents: 500 },
  lemonade: { unit: "bottle", cents: 300 },
  "iced-tea": { unit: "bottle", cents: 300 }
};

const unitAliases: Record<string, string> = {
  lbs: "lb", pound: "lb", pounds: "lb", ounce: "oz", ounces: "oz",
  cups: "cup", tablespoons: "tbsp", tablespoon: "tbsp", teaspoons: "tsp", teaspoon: "tsp"
};
const massUnits: Record<string, number> = { lb: 453.59237, oz: 28.349523125, kg: 1000, g: 1 };
const volumeUnits: Record<string, number> = { cup: 48, tbsp: 3, tsp: 1, pint: 96 };

function normalizeUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();
  return Object.hasOwn(unitAliases, normalized) ? unitAliases[normalized] : normalized;
}

/** Returns undefined rather than comparing incompatible package or mass units. */
export function ingredientCostWeight({ ingredient, quantity, unit }: DishIngredient): number | undefined {
  const reference = Object.hasOwn(referenceUnitCosts, ingredient.id) ? referenceUnitCosts[ingredient.id] : undefined;
  if (!reference || !Number.isFinite(quantity) || quantity <= 0) return undefined;
  const normalized = normalizeUnit(unit);
  if (normalized === reference.unit) return quantity * reference.cents;
  for (const conversions of [massUnits, volumeUnits]) {
    if (Object.hasOwn(conversions, normalized) && Object.hasOwn(conversions, reference.unit)) {
      return quantity * conversions[normalized] / conversions[reference.unit] * reference.cents;
    }
  }
  return undefined;
}

/** Preserve the recipe estimate exactly while giving costly ingredients their share. */
export function allocateIngredientCosts(dish: Dish, servings: number): number[] {
  if (dish.ingredients.length === 0) return [];
  const weights = dish.ingredients.map(ingredientCostWeight);
  // Unsupported/custom recipes have no reliable complete weighting. Keep the
  // existing equal-share fallback; the shopping page discloses that limitation.
  const supported = weights.every((weight) => weight !== undefined);
  const allocationWeights = supported ? weights as number[] : weights.map(() => 1);
  const weightTotal = allocationWeights.reduce((sum, weight) => sum + weight, 0);
  const cost = Math.round(dish.estimatedCostCents * servings / dish.baseServings);
  const exact = allocationWeights.map((weight) => cost * weight / weightTotal);
  const allocated = exact.map(Math.floor);
  const remainderOrder = exact.map((value, index) => ({ index, fraction: value - allocated[index] }))
    .sort((a, b) => b.fraction - a.fraction ||
      dish.ingredients[a.index].ingredient.id.localeCompare(dish.ingredients[b.index].ingredient.id) ||
      dish.ingredients[a.index].unit.localeCompare(dish.ingredients[b.index].unit) || a.index - b.index);
  const remaining = cost - allocated.reduce((sum, value) => sum + value, 0);
  for (const { index } of remainderOrder.slice(0, remaining)) allocated[index] += 1;
  return allocated;
}

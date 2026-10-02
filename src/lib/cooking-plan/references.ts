import type { CookingReference } from "./types";

// Publisher pages checked on 2026-10-02. These are references, not the source
// of TableSync's original, ingredient-matched preparation notes.
export const cookingReferences: Readonly<Record<string, CookingReference>> = {
  rice: { title: "How to Cook Rice on the Stove", publisher: "Love & Lemons", url: "https://www.loveandlemons.com/how-to-cook-rice/", difference: "A white-rice technique. Use your rice package's water ratio; optional oil is not needed." },
  quinoa: { title: "How to Cook Fluffy Quinoa", publisher: "Love & Lemons", url: "https://www.loveandlemons.com/quinoa/", difference: "Use the basic quinoa method; toppings and serving suggestions are not part of this menu." },
  hummus: { title: "Hummus", publisher: "Love & Lemons", url: "https://www.loveandlemons.com/hummus-recipe/", difference: "This recipe adds tahini (sesame) and garlic. Our lemon chickpea dip uses only its listed ingredients." },
  chickenRice: { title: "Oven Baked Chicken and Rice", publisher: "RecipeTin Eats", url: "https://www.recipetineats.com/oven-baked-chicken-and-rice/", difference: "A different recipe with butter (dairy), stock, seasoning and bone-in chicken. Its ingredients and cooking time do not match this tray." },
  tofu: { title: "Grilled Tofu", publisher: "Love & Lemons", url: "https://www.loveandlemons.com/grilled-tofu/", difference: "A pressing and grilling reference. Keep this menu's tamari; the optional dressings can add wheat or sesame." },
  vegetables: { title: "Grilled Vegetables", publisher: "Love & Lemons", url: "https://www.loveandlemons.com/grilled-vegetables/", difference: "Use the technique for the listed vegetables. Extra vegetables and sauces are not included in this menu." },
  fruit: { title: "Easy Fruit Salad", publisher: "Love & Lemons", url: "https://www.loveandlemons.com/fruit-salad-recipe/", difference: "A related fruit recipe with different fruit and dressing. Do not add its honey to a vegan menu." },
  apple: { title: "Apple Crisp", publisher: "Love & Lemons", url: "https://www.loveandlemons.com/apple-crisp/", difference: "A different dessert that adds wheat flour and butter. It is not a recipe for our vegan, gluten-free oat squares." },
  hotpot: { title: "Chinese Hot Pot at Home", publisher: "The Woks of Life", url: "https://thewoksoflife.com/chinese-hot-pot-at-home/", difference: "A setup reference with additional broths, sauces and allergens. Keep the selected menu and use safe temperature checks." }
};

export const cookingSafetySources = {
  temperature: "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
  handling: "https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety",
  picnic: "https://www.foodsafety.gov/blog/splash-food-safety-pool-summer"
} as const;

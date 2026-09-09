import type {
  DinnerRoom,
  Dish,
  DishCategory,
  EventType,
  Guest,
  HotpotRole,
  Ingredient,
  IngredientCategory,
  SpiceLevel,
  User
} from "@/lib/domain";

const now = new Date("2026-06-15T18:00:00.000Z").toISOString();

export const demoHost: User = {
  id: "user-demo-host",
  name: "Pat Host",
  email: "pat@example.com"
};

const ingredientRows: Array<{
  id: string;
  name: string;
  category: IngredientCategory;
  defaultUnit: string;
  tags: string[];
}> = [
  { id: "rice", name: "rice", category: "PANTRY", defaultUnit: "cup", tags: ["gluten-free", "vegan"] },
  { id: "brown-rice", name: "brown rice", category: "PANTRY", defaultUnit: "cup", tags: ["gluten-free", "vegan"] },
  { id: "wheat-pasta", name: "wheat pasta", category: "PANTRY", defaultUnit: "lb", tags: ["gluten", "wheat", "vegetarian"] },
  { id: "gluten-free-pasta", name: "gluten-free pasta", category: "PANTRY", defaultUnit: "lb", tags: ["gluten-free", "vegetarian"] },
  { id: "tortillas", name: "flour tortillas", category: "PANTRY", defaultUnit: "pack", tags: ["gluten", "wheat", "vegetarian"] },
  { id: "corn-tortillas", name: "corn tortillas", category: "PANTRY", defaultUnit: "pack", tags: ["gluten-free", "vegan"] },
  { id: "tortilla-chips", name: "tortilla chips", category: "PANTRY", defaultUnit: "bag", tags: ["gluten-free", "vegan"] },
  { id: "chicken", name: "chicken", category: "MEAT_SEAFOOD", defaultUnit: "lb", tags: ["meat", "chicken", "halal-optional"] },
  { id: "beef", name: "beef", category: "MEAT_SEAFOOD", defaultUnit: "lb", tags: ["meat", "beef"] },
  { id: "pork", name: "pork", category: "MEAT_SEAFOOD", defaultUnit: "lb", tags: ["meat", "pork"] },
  { id: "salmon", name: "salmon", category: "MEAT_SEAFOOD", defaultUnit: "lb", tags: ["seafood", "fish"] },
  { id: "shrimp", name: "shrimp", category: "MEAT_SEAFOOD", defaultUnit: "lb", tags: ["seafood", "shellfish"] },
  { id: "tofu", name: "tofu", category: "PRODUCE", defaultUnit: "block", tags: ["soy", "vegan", "vegetarian"] },
  { id: "chickpeas", name: "chickpeas", category: "PANTRY", defaultUnit: "can", tags: ["vegan", "gluten-free"] },
  { id: "black-beans", name: "black beans", category: "PANTRY", defaultUnit: "can", tags: ["vegan", "gluten-free"] },
  { id: "lentils", name: "lentils", category: "PANTRY", defaultUnit: "cup", tags: ["vegan", "gluten-free"] },
  { id: "quinoa", name: "quinoa", category: "PANTRY", defaultUnit: "cup", tags: ["vegan", "gluten-free"] },
  { id: "certified-oats", name: "certified gluten-free oats", category: "PANTRY", defaultUnit: "cup", tags: ["vegan", "gluten-free"] },
  { id: "olive-oil", name: "olive oil", category: "PANTRY", defaultUnit: "tbsp", tags: ["vegan", "gluten-free"] },
  { id: "potatoes", name: "potatoes", category: "PRODUCE", defaultUnit: "lb", tags: ["vegan", "gluten-free"] },
  { id: "corn", name: "corn on the cob", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "lemon", name: "lemon", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "fresh-herbs", name: "parsley", category: "PRODUCE", defaultUnit: "bunch", tags: ["vegan", "gluten-free"] },
  { id: "apples", name: "apples", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "oranges", name: "oranges", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "grapes", name: "grapes", category: "PRODUCE", defaultUnit: "lb", tags: ["vegan", "gluten-free"] },
  { id: "eggs", name: "eggs", category: "DAIRY", defaultUnit: "each", tags: ["egg", "vegetarian", "gluten-free"] },
  { id: "mushrooms", name: "mushrooms", category: "PRODUCE", defaultUnit: "lb", tags: ["vegan", "umami"] },
  { id: "cabbage", name: "cabbage", category: "PRODUCE", defaultUnit: "head", tags: ["vegan", "gluten-free"] },
  { id: "bok-choy", name: "bok choy", category: "PRODUCE", defaultUnit: "bunch", tags: ["vegan", "gluten-free"] },
  { id: "spinach", name: "spinach", category: "PRODUCE", defaultUnit: "bag", tags: ["vegan", "gluten-free"] },
  { id: "cucumber", name: "cucumber", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "tomato", name: "tomatoes", category: "PRODUCE", defaultUnit: "lb", tags: ["vegan", "gluten-free"] },
  { id: "onion", name: "onion", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "bell-pepper", name: "bell pepper", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "carrot", name: "carrots", category: "PRODUCE", defaultUnit: "lb", tags: ["vegan", "gluten-free"] },
  { id: "broccoli", name: "broccoli", category: "PRODUCE", defaultUnit: "lb", tags: ["vegan", "gluten-free"] },
  { id: "avocado", name: "avocado", category: "PRODUCE", defaultUnit: "each", tags: ["vegan", "gluten-free"] },
  { id: "fruit", name: "seasonal fruit", category: "PRODUCE", defaultUnit: "lb", tags: ["vegan", "gluten-free"] },
  { id: "garlic", name: "garlic", category: "PRODUCE", defaultUnit: "head", tags: ["vegan", "gluten-free"] },
  { id: "ginger", name: "ginger", category: "PRODUCE", defaultUnit: "oz", tags: ["vegan", "gluten-free"] },
  { id: "cheese", name: "cheese", category: "DAIRY", defaultUnit: "lb", tags: ["dairy", "vegetarian", "gluten-free"] },
  { id: "mozzarella", name: "mozzarella", category: "DAIRY", defaultUnit: "lb", tags: ["dairy", "vegetarian", "gluten-free"] },
  { id: "yogurt", name: "yogurt", category: "DAIRY", defaultUnit: "cup", tags: ["dairy", "vegetarian", "gluten-free"] },
  { id: "ice-cream", name: "ice cream", category: "FROZEN", defaultUnit: "pint", tags: ["dairy", "vegetarian", "gluten-free"] },
  { id: "coconut-milk", name: "coconut milk", category: "PANTRY", defaultUnit: "can", tags: ["vegan", "gluten-free"] },
  { id: "bread", name: "bread", category: "PANTRY", defaultUnit: "loaf", tags: ["gluten", "wheat", "vegetarian"] },
  { id: "brownie-mix", name: "brownie mix", category: "PANTRY", defaultUnit: "box", tags: ["gluten", "wheat", "vegetarian"] },
  { id: "mochi", name: "mochi", category: "FROZEN", defaultUnit: "box", tags: ["gluten-free", "vegetarian"] },
  { id: "peanut-sauce", name: "peanut sauce", category: "PANTRY", defaultUnit: "jar", tags: ["peanut", "nuts", "vegetarian"] },
  { id: "soy-sauce", name: "soy sauce", category: "PANTRY", defaultUnit: "bottle", tags: ["soy", "gluten"] },
  { id: "tamari", name: "tamari", category: "PANTRY", defaultUnit: "bottle", tags: ["soy", "gluten-free"] },
  { id: "sesame-oil", name: "sesame oil", category: "PANTRY", defaultUnit: "bottle", tags: ["sesame", "vegan", "gluten-free"] },
  { id: "kimchi", name: "kimchi", category: "PRODUCE", defaultUnit: "jar", tags: ["vegetarian", "spicy", "gluten-free"] },
  { id: "broth", name: "vegetable broth", category: "PANTRY", defaultUnit: "carton", tags: ["vegan", "gluten-free"] },
  { id: "gochujang", name: "gochujang", category: "PANTRY", defaultUnit: "jar", tags: ["spicy", "gluten"] },
  { id: "curry-paste", name: "curry paste", category: "PANTRY", defaultUnit: "jar", tags: ["spicy", "vegan", "gluten-free"] },
  { id: "hummus", name: "hummus", category: "PANTRY", defaultUnit: "tub", tags: ["vegan", "gluten-free"] },
  { id: "sparkling-water", name: "sparkling water", category: "DRINKS", defaultUnit: "case", tags: ["vegan", "gluten-free"] },
  { id: "lemonade", name: "lemonade", category: "DRINKS", defaultUnit: "bottle", tags: ["vegan", "gluten-free"] },
  { id: "iced-tea", name: "iced tea", category: "DRINKS", defaultUnit: "bottle", tags: ["vegan", "gluten-free"] }
];

export const ingredients = ingredientRows.reduce<Record<string, Ingredient>>((acc, row) => {
  acc[row.id] = row;
  return acc;
}, {});

function item(id: string, quantity: number, unit?: string) {
  const ingredient = ingredients[id];
  if (!ingredient) {
    throw new Error(`Missing ingredient: ${id}`);
  }
  return { ingredient, quantity, unit: unit ?? ingredient.defaultUnit };
}

function dish(input: {
  id: string;
  name: string;
  description: string;
  category: DishCategory;
  cuisine: string;
  baseServings?: number;
  estimatedCostCents: number;
  prepTimeMinutes: number;
  spiceLevel: SpiceLevel;
  spiceAdjustable?: boolean;
  supportedEventTypes?: EventType[];
  hotpotRole?: HotpotRole;
  tags: string[];
  ingredients: Array<ReturnType<typeof item>>;
}): Dish {
  return {
    baseServings: 4,
    spiceAdjustable: false,
    supportedEventTypes: ["DINNER"],
    ...input
  };
}

// Event eligibility is intentional: each new main is substantial, and portability,
// grill preparation, and buffet suitability are represented separately from diet tags.
const gatheringDishCatalog: Dish[] = [
  dish({
    id: "lentil-rice-bake", name: "Lentil and vegetable rice bake",
    description: "A shareable tray of lentils, rice, carrots, and tomatoes.",
    category: "MAIN", cuisine: "Mediterranean", estimatedCostCents: 1500, prepTimeMinutes: 45, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "OTHER"], tags: ["vegan", "gluten-free", "shareable", "buffet", "lentils", "rice"],
    ingredients: [item("lentils", 1.5), item("rice", 1.5), item("carrot", 1), item("tomato", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "chickpea-potato-casserole", name: "Chickpea and potato casserole",
    description: "Chickpeas and potatoes baked with spinach and a tomato sauce for sharing.",
    category: "MAIN", cuisine: "Mediterranean", estimatedCostCents: 1700, prepTimeMinutes: 40, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "OTHER"], tags: ["vegan", "gluten-free", "shareable", "buffet", "chickpeas"],
    ingredients: [item("chickpeas", 3), item("potatoes", 2), item("spinach", 1), item("tomato", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "chicken-rice-tray", name: "Herb chicken and rice tray",
    description: "Chicken, rice, and roasted peppers portioned from a shared baking tray.",
    category: "MAIN", cuisine: "American", estimatedCostCents: 2300, prepTimeMinutes: 45, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "OTHER"], tags: ["chicken", "meat", "gluten-free", "shareable", "buffet", "rice"],
    ingredients: [item("chicken", 1.5), item("rice", 2), item("bell-pepper", 2), item("fresh-herbs", 0.5), item("olive-oil", 2)]
  }),
  dish({
    id: "vegetable-pasta-tray", name: "Vegetable and cheese pasta tray",
    description: "Pasta baked with broccoli, tomato, and mozzarella for a shared meal.",
    category: "MAIN", cuisine: "Italian", estimatedCostCents: 1900, prepTimeMinutes: 40, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "OTHER"], tags: ["vegetarian", "shareable", "buffet", "pasta"],
    ingredients: [item("wheat-pasta", 1), item("broccoli", 1), item("tomato", 1), item("mozzarella", 0.75), item("olive-oil", 1)]
  }),
  dish({
    id: "grilled-lentil-patties", name: "Grilled lentil and potato patties",
    description: "Hearty lentil and potato patties cooked on the grill, with a rice accompaniment.",
    category: "MAIN", cuisine: "American", estimatedCostCents: 1500, prepTimeMinutes: 35, spiceLevel: "NONE",
    supportedEventTypes: ["BBQ"], tags: ["vegan", "gluten-free", "grilled", "lentils", "rice"],
    ingredients: [item("lentils", 1.5), item("potatoes", 1), item("rice", 1), item("onion", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "grilled-chickpea-peppers", name: "Grilled chickpea-stuffed peppers",
    description: "Grilled peppers filled with chickpeas, quinoa, and parsley.",
    category: "MAIN", cuisine: "Mediterranean", estimatedCostCents: 1800, prepTimeMinutes: 35, spiceLevel: "NONE",
    supportedEventTypes: ["BBQ"], tags: ["vegan", "gluten-free", "grilled", "chickpeas"],
    ingredients: [item("bell-pepper", 4), item("chickpeas", 3), item("quinoa", 1.5), item("fresh-herbs", 0.5), item("olive-oil", 2)]
  }),
  dish({
    id: "grilled-tofu-rice", name: "Grilled tofu skewers with rice",
    description: "Tofu and mushroom skewers grilled with tamari and served with rice.",
    category: "MAIN", cuisine: "Global", estimatedCostCents: 1900, prepTimeMinutes: 30, spiceLevel: "NONE",
    supportedEventTypes: ["BBQ"], tags: ["vegan", "gluten-free", "grilled", "tofu", "rice"],
    ingredients: [item("tofu", 2), item("mushrooms", 1), item("rice", 1.5), item("tamari", 0.15), item("olive-oil", 1)]
  }),
  dish({
    id: "picnic-chickpea-quinoa", name: "Chickpea quinoa picnic bowls",
    description: "Portable chilled bowls of quinoa, chickpeas, cucumber, and lemon dressing.",
    category: "MAIN", cuisine: "Mediterranean", estimatedCostCents: 1800, prepTimeMinutes: 25, spiceLevel: "NONE",
    supportedEventTypes: ["PICNIC"], tags: ["vegan", "gluten-free", "portable", "chickpeas"],
    ingredients: [item("quinoa", 2), item("chickpeas", 3), item("cucumber", 2), item("lemon", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "picnic-chicken-rice", name: "Chicken and rice picnic salad",
    description: "Chilled chicken, rice, carrots, and parsley packed in individual containers.",
    category: "MAIN", cuisine: "American", estimatedCostCents: 2200, prepTimeMinutes: 30, spiceLevel: "NONE",
    supportedEventTypes: ["PICNIC"], tags: ["meat", "chicken", "gluten-free", "portable", "rice"],
    ingredients: [item("chicken", 1.5), item("rice", 2), item("carrot", 1), item("fresh-herbs", 0.5), item("olive-oil", 2)]
  }),
  dish({
    id: "picnic-lentil-wraps", name: "Lentil and vegetable wraps",
    description: "Flour tortilla wraps filled with lentils, cabbage, and avocado; pack chilled.",
    category: "MAIN", cuisine: "Global", estimatedCostCents: 1600, prepTimeMinutes: 25, spiceLevel: "NONE",
    supportedEventTypes: ["PICNIC"], tags: ["vegan", "portable", "lentils"],
    ingredients: [item("tortillas", 1), item("lentils", 2), item("cabbage", 0.5), item("avocado", 2), item("lemon", 1)]
  }),
  dish({
    id: "picnic-bean-corn-wraps", name: "Black bean corn tortilla wraps",
    description: "Portable corn tortillas with black beans, rice, and crunchy carrots; pack chilled.",
    category: "MAIN", cuisine: "Mexican", estimatedCostCents: 1500, prepTimeMinutes: 25, spiceLevel: "NONE",
    supportedEventTypes: ["PICNIC"], tags: ["vegan", "gluten-free", "portable", "beans", "rice"],
    ingredients: [item("corn-tortillas", 1), item("black-beans", 3), item("rice", 1), item("carrot", 1), item("olive-oil", 1)]
  }),
  dish({
    id: "brunch-chickpea-hash", name: "Chickpea breakfast hash",
    description: "A hearty breakfast skillet of chickpeas, potatoes, peppers, and spinach.",
    category: "MAIN", cuisine: "American", estimatedCostCents: 1700, prepTimeMinutes: 30, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegan", "gluten-free", "brunch", "chickpeas"],
    ingredients: [item("chickpeas", 3), item("potatoes", 2), item("bell-pepper", 2), item("spinach", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "brunch-vegetable-frittata", name: "Potato and spinach frittata",
    description: "A brunch frittata with eggs, potatoes, spinach, and tomatoes.",
    category: "MAIN", cuisine: "Italian", estimatedCostCents: 1600, prepTimeMinutes: 35, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegetarian", "gluten-free", "brunch", "egg"],
    ingredients: [item("eggs", 8), item("potatoes", 1.5), item("spinach", 1), item("tomato", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "brunch-avocado-bean-toast", name: "Avocado and chickpea toast",
    description: "Lunch-style toast topped with mashed chickpeas, avocado, and lemon.",
    category: "MAIN", cuisine: "Global", estimatedCostCents: 1700, prepTimeMinutes: 15, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegan", "brunch", "chickpeas"],
    ingredients: [item("bread", 1), item("chickpeas", 3), item("avocado", 3), item("lemon", 1)]
  }),
  dish({
    id: "brunch-tofu-scramble", name: "Tofu scramble and rice bowls",
    description: "Breakfast tofu scramble with mushrooms and spinach, served over rice.",
    category: "MAIN", cuisine: "Global", estimatedCostCents: 1800, prepTimeMinutes: 25, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegan", "gluten-free", "brunch", "tofu", "rice"],
    ingredients: [item("tofu", 2), item("rice", 1.5), item("mushrooms", 1), item("spinach", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "herb-potato-salad", name: "Lemon herb potato salad",
    description: "A shareable potato salad with olive oil and parsley dressing, packed chilled.",
    category: "SIDE", cuisine: "Mediterranean", estimatedCostCents: 650, prepTimeMinutes: 25, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "BBQ", "PICNIC", "OTHER"], tags: ["vegan", "gluten-free", "shareable", "portable", "buffet"],
    ingredients: [item("potatoes", 2), item("lemon", 1), item("fresh-herbs", 0.5), item("olive-oil", 2)]
  }),
  dish({
    id: "carrot-cabbage-slaw", name: "Carrot and cabbage slaw",
    description: "Crunchy vegetables tossed in lemon and olive oil, ready to share or pack chilled.",
    category: "SIDE", cuisine: "American", estimatedCostCents: 550, prepTimeMinutes: 15, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "BBQ", "PICNIC", "OTHER"], tags: ["vegan", "gluten-free", "shareable", "portable", "buffet"],
    ingredients: [item("carrot", 1), item("cabbage", 0.5), item("lemon", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "cucumber-chickpea-salad", name: "Cucumber and chickpea salad",
    description: "A chilled sharing salad of cucumber, chickpeas, and fresh parsley.",
    category: "SIDE", cuisine: "Mediterranean", estimatedCostCents: 750, prepTimeMinutes: 15, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "BBQ", "PICNIC", "OTHER"], tags: ["vegan", "gluten-free", "shareable", "portable", "buffet"],
    ingredients: [item("cucumber", 2), item("chickpeas", 2), item("fresh-herbs", 0.5), item("lemon", 1), item("olive-oil", 1)]
  }),
  dish({
    id: "grilled-corn", name: "Grilled corn on the cob",
    description: "Corn cooked on the grill and brushed with olive oil.",
    category: "SIDE", cuisine: "American", estimatedCostCents: 650, prepTimeMinutes: 20, spiceLevel: "NONE",
    supportedEventTypes: ["BBQ"], tags: ["vegan", "gluten-free", "grilled"],
    ingredients: [item("corn", 4), item("olive-oil", 1)]
  }),
  dish({
    id: "brunch-breakfast-potatoes", name: "Roasted breakfast potatoes",
    description: "Crisp potatoes and onions for a savory brunch side.",
    category: "SIDE", cuisine: "American", estimatedCostCents: 650, prepTimeMinutes: 30, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegan", "gluten-free", "savory"],
    ingredients: [item("potatoes", 2), item("onion", 1), item("olive-oil", 2)]
  }),
  dish({
    id: "brunch-spinach-mushrooms", name: "Savory spinach and mushrooms",
    description: "Spinach and mushrooms sauteed in olive oil for brunch.",
    category: "SIDE", cuisine: "Global", estimatedCostCents: 800, prepTimeMinutes: 15, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegan", "gluten-free", "savory"],
    ingredients: [item("spinach", 1), item("mushrooms", 1), item("olive-oil", 1)]
  }),
  dish({
    id: "brunch-citrus-grapes", name: "Orange and grape fruit salad",
    description: "Fresh oranges and grapes served as a brunch fruit side.",
    category: "SIDE", cuisine: "Global", estimatedCostCents: 700, prepTimeMinutes: 10, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegan", "gluten-free", "fruit"],
    ingredients: [item("oranges", 4), item("grapes", 1)]
  }),
  dish({
    id: "brunch-apple-side", name: "Fresh apple wedges",
    description: "Sliced apples with a little lemon served as a brunch fruit side.",
    category: "SIDE", cuisine: "Global", estimatedCostCents: 500, prepTimeMinutes: 10, spiceLevel: "NONE",
    supportedEventTypes: ["BRUNCH"], tags: ["vegan", "gluten-free", "fruit"],
    ingredients: [item("apples", 4), item("lemon", 0.5)]
  }),
  dish({
    id: "gathering-fruit-cups", name: "Apple and orange fruit cups",
    description: "Fresh apple and orange pieces in portable cups for a shared dessert.",
    category: "DESSERT", cuisine: "Global", estimatedCostCents: 650, prepTimeMinutes: 15, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "PICNIC"], tags: ["vegan", "gluten-free", "shareable", "portable", "fruit"],
    ingredients: [item("apples", 2), item("oranges", 3), item("lemon", 0.5)]
  }),
  dish({
    id: "apple-oat-squares", name: "Apple oat squares",
    description: "Shareable baked apple and certified gluten-free oat squares that pack easily.",
    category: "DESSERT", cuisine: "American", estimatedCostCents: 700, prepTimeMinutes: 35, spiceLevel: "NONE",
    supportedEventTypes: ["POTLUCK", "PICNIC"], tags: ["vegan", "gluten-free", "shareable", "portable"],
    ingredients: [item("apples", 3), item("certified-oats", 2), item("olive-oil", 3)]
  }),
  dish({
    id: "buffet-chickpea-dip", name: "Lemon chickpea dip and vegetables",
    description: "Chickpeas blended with lemon and olive oil, served with vegetable sticks on a buffet board.",
    category: "APPETIZER", cuisine: "Mediterranean", estimatedCostCents: 850, prepTimeMinutes: 15, spiceLevel: "NONE",
    supportedEventTypes: ["OTHER"], tags: ["vegan", "gluten-free", "buffet"],
    ingredients: [item("chickpeas", 2), item("lemon", 1), item("olive-oil", 2), item("carrot", 1), item("cucumber", 2)]
  }),
  dish({
    id: "buffet-tomato-skewers", name: "Tomato and cucumber skewers",
    description: "Small tomato and cucumber skewers with parsley for a shared buffet starter.",
    category: "APPETIZER", cuisine: "Mediterranean", estimatedCostCents: 650, prepTimeMinutes: 15, spiceLevel: "NONE",
    supportedEventTypes: ["OTHER"], tags: ["vegan", "gluten-free", "buffet"],
    ingredients: [item("tomato", 1), item("cucumber", 2), item("fresh-herbs", 0.5)]
  }),
  dish({
    id: "bbq-lemon-herb-sauce", name: "Lemon and parsley grill sauce",
    description: "A mild lemon, parsley, and olive oil accompaniment for grilled food.",
    category: "SAUCE", cuisine: "Mediterranean", estimatedCostCents: 450, prepTimeMinutes: 10, spiceLevel: "NONE",
    supportedEventTypes: ["BBQ"], tags: ["vegan", "gluten-free"],
    ingredients: [item("lemon", 2), item("fresh-herbs", 0.5), item("olive-oil", 4)]
  }),
  dish({
    id: "bbq-tomato-sauce", name: "Tomato grill sauce",
    description: "A simmered tomato and garlic sauce served separately alongside grilled mains.",
    category: "SAUCE", cuisine: "American", estimatedCostCents: 500, prepTimeMinutes: 20, spiceLevel: "NONE",
    supportedEventTypes: ["BBQ"], tags: ["vegan", "gluten-free"],
    ingredients: [item("tomato", 1), item("garlic", 0.5), item("olive-oil", 1)]
  })
];

export const dishCatalog: Dish[] = [
  dish({
    id: "mushroom-hotpot-broth",
    name: "Mushroom hotpot broth",
    description: "Savory vegetable broth with mushrooms, tofu, bok choy, and cabbage.",
    category: "MAIN",
    cuisine: "Chinese",
    estimatedCostCents: 2200,
    prepTimeMinutes: 45,
    spiceLevel: "MILD",
    spiceAdjustable: true,
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "BROTH",
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "mushroom"],
    ingredients: [item("broth", 2), item("mushrooms", 2), item("tofu", 3), item("bok-choy", 3), item("cabbage", 1), item("tamari", 1)]
  }),
  dish({
    id: "tomato-hotpot-broth",
    name: "Tomato hotpot broth",
    description: "A mild tomato and vegetable broth designed for shared hotpot.",
    category: "MAIN",
    cuisine: "Chinese",
    estimatedCostCents: 1200,
    prepTimeMinutes: 30,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "BROTH",
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "broth"],
    ingredients: [item("broth", 2), item("tomato", 2), item("onion", 1), item("garlic", 1)]
  }),
  dish({
    id: "hotpot-tofu",
    name: "Hotpot tofu platter",
    description: "Firm tofu portions ready to cook in a shared broth.",
    category: "MAIN",
    cuisine: "Chinese",
    estimatedCostCents: 800,
    prepTimeMinutes: 10,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "PROTEIN",
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "protein", "tofu"],
    ingredients: [item("tofu", 4)]
  }),
  dish({
    id: "hotpot-beef-slices",
    name: "Thin-sliced hotpot beef",
    description: "Thin beef slices portioned for quick hotpot cooking.",
    category: "MAIN",
    cuisine: "Chinese",
    estimatedCostCents: 1600,
    prepTimeMinutes: 10,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "PROTEIN",
    tags: ["beef", "meat", "gluten-free", "hotpot", "protein"],
    ingredients: [item("beef", 3)]
  }),
  dish({
    id: "hotpot-chicken-slices",
    name: "Hotpot chicken slices",
    description: "Chicken slices portioned for cooking safely in hotpot broth.",
    category: "MAIN",
    cuisine: "Chinese",
    estimatedCostCents: 1300,
    prepTimeMinutes: 15,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "PROTEIN",
    tags: ["chicken", "meat", "gluten-free", "hotpot", "protein"],
    ingredients: [item("chicken", 3)]
  }),
  dish({
    id: "hotpot-mushroom-platter",
    name: "Hotpot mushroom platter",
    description: "A mixed mushroom platter for the shared pot.",
    category: "SIDE",
    cuisine: "Chinese",
    estimatedCostCents: 700,
    prepTimeMinutes: 10,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "VEGETABLE",
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "vegetable", "mushroom"],
    ingredients: [item("mushrooms", 4)]
  }),
  dish({
    id: "hotpot-leafy-greens",
    name: "Hotpot leafy greens",
    description: "Bok choy and cabbage prepared for quick cooking.",
    category: "SIDE",
    cuisine: "Chinese",
    estimatedCostCents: 650,
    prepTimeMinutes: 12,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "VEGETABLE",
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "vegetable"],
    ingredients: [item("bok-choy", 4), item("cabbage", 2)]
  }),
  dish({
    id: "hotpot-garlic-tamari-sauce",
    name: "Garlic tamari dipping sauce",
    description: "A gluten-free garlic, tamari, and sesame oil dipping sauce.",
    category: "SAUCE",
    cuisine: "Chinese",
    estimatedCostCents: 350,
    prepTimeMinutes: 5,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "SAUCE",
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "sauce"],
    ingredients: [item("tamari", 2), item("garlic", 1), item("sesame-oil", 1)]
  }),
  dish({
    id: "hotpot-ginger-sesame-sauce",
    name: "Ginger sesame dipping sauce",
    description: "A mild ginger and sesame oil dipping sauce with tamari.",
    category: "SAUCE",
    cuisine: "Chinese",
    estimatedCostCents: 350,
    prepTimeMinutes: 5,
    spiceLevel: "NONE",
    supportedEventTypes: ["HOTPOT"],
    hotpotRole: "SAUCE",
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "sauce"],
    ingredients: [item("ginger", 2), item("sesame-oil", 1), item("tamari", 2)]
  }),
  dish({
    id: "chicken-taco-bowl",
    name: "Chicken taco bowl",
    description: "Rice bowls with chicken, black beans, peppers, avocado, and salsa-style toppings.",
    category: "MAIN",
    cuisine: "Mexican",
    estimatedCostCents: 2600,
    prepTimeMinutes: 40,
    spiceLevel: "MEDIUM",
    spiceAdjustable: true,
    tags: ["chicken", "gluten-free", "taco", "rice"],
    ingredients: [item("rice", 2), item("chicken", 2), item("black-beans", 3), item("bell-pepper", 4), item("avocado", 3), item("tomato", 1)]
  }),
  dish({
    id: "vegetarian-pasta-bake",
    name: "Vegetarian pasta bake",
    description: "Baked pasta with tomatoes, spinach, mushrooms, and mozzarella.",
    category: "MAIN",
    cuisine: "Italian",
    estimatedCostCents: 2100,
    prepTimeMinutes: 55,
    spiceLevel: "NONE",
    tags: ["vegetarian", "gluten", "dairy", "pasta"],
    ingredients: [item("wheat-pasta", 2), item("tomato", 2), item("spinach", 1), item("mushrooms", 1), item("mozzarella", 1)]
  }),
  dish({
    id: "gluten-free-pasta-bake",
    name: "Gluten-free pasta bake",
    description: "Gluten-free pasta baked with tomato, spinach, mushrooms, and mozzarella.",
    category: "MAIN",
    cuisine: "Italian",
    estimatedCostCents: 2500,
    prepTimeMinutes: 55,
    spiceLevel: "NONE",
    tags: ["vegetarian", "gluten-free", "dairy", "pasta"],
    ingredients: [item("gluten-free-pasta", 2), item("tomato", 2), item("spinach", 1), item("mushrooms", 1), item("mozzarella", 1)]
  }),
  dish({
    id: "beef-bulgogi-rice-bowl",
    name: "Beef bulgogi rice bowl",
    description: "Sweet-savory beef over rice with cucumber and kimchi.",
    category: "MAIN",
    cuisine: "Korean",
    estimatedCostCents: 3100,
    prepTimeMinutes: 50,
    spiceLevel: "MEDIUM",
    spiceAdjustable: true,
    tags: ["beef", "meat", "rice"],
    ingredients: [item("rice", 2), item("beef", 2), item("cucumber", 3), item("kimchi", 1), item("soy-sauce", 1), item("sesame-oil", 1)]
  }),
  dish({
    id: "chickpea-curry",
    name: "Chickpea coconut curry",
    description: "Coconut curry with chickpeas, carrots, spinach, and rice.",
    category: "MAIN",
    cuisine: "Indian",
    estimatedCostCents: 1900,
    prepTimeMinutes: 35,
    spiceLevel: "HOT",
    tags: ["vegan", "vegetarian", "gluten-free", "curry"],
    ingredients: [item("chickpeas", 4), item("coconut-milk", 2), item("curry-paste", 1), item("carrot", 1), item("spinach", 1), item("rice", 2)]
  }),
  dish({
    id: "salmon-rice-bowl",
    name: "Salmon rice bowl",
    description: "Roasted salmon with rice, cucumber, avocado, and tamari.",
    category: "MAIN",
    cuisine: "Japanese",
    estimatedCostCents: 3600,
    prepTimeMinutes: 35,
    spiceLevel: "MILD",
    tags: ["seafood", "fish", "gluten-free", "rice"],
    ingredients: [item("salmon", 2), item("rice", 2), item("cucumber", 2), item("avocado", 3), item("tamari", 1)]
  }),
  dish({
    id: "build-your-own-taco-night",
    name: "Build-your-own taco night",
    description: "Corn tortillas, beans, vegetables, cheese, and optional chicken.",
    category: "MAIN",
    cuisine: "Mexican",
    estimatedCostCents: 2800,
    prepTimeMinutes: 45,
    spiceLevel: "MILD",
    spiceAdjustable: true,
    tags: ["gluten-free", "taco", "flexible", "chicken-optional"],
    ingredients: [item("corn-tortillas", 2), item("black-beans", 4), item("bell-pepper", 4), item("cheese", 1), item("chicken", 1), item("avocado", 3)]
  }),
  dish({
    id: "tofu-vegetable-stir-fry",
    name: "Tofu vegetable stir fry",
    description: "Tofu, broccoli, carrots, mushrooms, and tamari over rice.",
    category: "MAIN",
    cuisine: "Chinese",
    estimatedCostCents: 2000,
    prepTimeMinutes: 30,
    spiceLevel: "MILD",
    spiceAdjustable: true,
    tags: ["vegan", "vegetarian", "gluten-free", "tofu"],
    ingredients: [item("tofu", 3), item("broccoli", 2), item("carrot", 1), item("mushrooms", 1), item("rice", 2), item("tamari", 1)]
  }),
  dish({
    id: "black-bean-chili",
    name: "Black bean chili",
    description: "Slow simmered black beans, tomatoes, peppers, and warming spices.",
    category: "MAIN",
    cuisine: "Tex-Mex",
    estimatedCostCents: 1800,
    prepTimeMinutes: 50,
    spiceLevel: "MEDIUM",
    tags: ["vegan", "vegetarian", "gluten-free", "beans"],
    ingredients: [item("black-beans", 5), item("tomato", 2), item("bell-pepper", 3), item("onion", 2), item("garlic", 1)]
  }),
  dish({
    id: "bbq-chicken-skewers",
    name: "BBQ chicken skewers",
    description: "Chicken and vegetables ready for a grill night.",
    category: "MAIN",
    cuisine: "American",
    estimatedCostCents: 3000,
    prepTimeMinutes: 45,
    spiceLevel: "MILD",
    supportedEventTypes: ["DINNER", "BBQ"],
    tags: ["chicken", "meat", "bbq", "gluten-free", "grilled"],
    ingredients: [item("chicken", 3), item("bell-pepper", 4), item("onion", 2), item("garlic", 1)]
  }),
  dish({
    id: "shrimp-fajitas",
    name: "Shrimp fajitas",
    description: "Shrimp, peppers, onions, and warm corn tortillas.",
    category: "MAIN",
    cuisine: "Mexican",
    estimatedCostCents: 3300,
    prepTimeMinutes: 30,
    spiceLevel: "MEDIUM",
    tags: ["seafood", "shellfish", "gluten-free", "taco"],
    ingredients: [item("shrimp", 2), item("corn-tortillas", 2), item("bell-pepper", 4), item("onion", 2), item("avocado", 2)]
  }),
  dish({
    id: "cucumber-salad",
    name: "Cucumber salad",
    description: "Crisp cucumbers with sesame oil, ginger, and tamari.",
    category: "SIDE",
    cuisine: "Korean",
    estimatedCostCents: 700,
    prepTimeMinutes: 15,
    spiceLevel: "NONE",
    tags: ["vegan", "gluten-free", "fresh"],
    ingredients: [item("cucumber", 5), item("ginger", 2), item("tamari", 1), item("sesame-oil", 1)]
  }),
  dish({
    id: "garlic-bread",
    name: "Garlic bread",
    description: "Toasted bread with garlic and cheese.",
    category: "SIDE",
    cuisine: "Italian",
    estimatedCostCents: 800,
    prepTimeMinutes: 15,
    spiceLevel: "NONE",
    tags: ["vegetarian", "gluten", "dairy"],
    ingredients: [item("bread", 2), item("garlic", 1), item("cheese", 1)]
  }),
  dish({
    id: "roasted-vegetables",
    name: "Roasted vegetables",
    description: "Carrots, broccoli, peppers, onions, and garlic.",
    category: "SIDE",
    cuisine: "American",
    estimatedCostCents: 1100,
    prepTimeMinutes: 35,
    spiceLevel: "NONE",
    tags: ["vegan", "gluten-free", "vegetables"],
    ingredients: [item("carrot", 1), item("broccoli", 2), item("bell-pepper", 3), item("onion", 2), item("garlic", 1)]
  }),
  dish({
    id: "kimchi-side",
    name: "Kimchi",
    description: "A spicy fermented cabbage side.",
    category: "SIDE",
    cuisine: "Korean",
    estimatedCostCents: 650,
    prepTimeMinutes: 5,
    spiceLevel: "HOT",
    tags: ["vegetarian", "gluten-free", "spicy"],
    ingredients: [item("kimchi", 2)]
  }),
  dish({
    id: "steamed-rice",
    name: "Steamed rice",
    description: "Simple rice for sharing.",
    category: "SIDE",
    cuisine: "Global",
    estimatedCostCents: 400,
    prepTimeMinutes: 25,
    spiceLevel: "NONE",
    supportedEventTypes: ["DINNER", "HOTPOT"],
    hotpotRole: "STAPLE",
    tags: ["vegan", "gluten-free", "rice"],
    ingredients: [item("rice", 3)]
  }),
  dish({
    id: "tortilla-chips-side",
    name: "Tortilla chips",
    description: "Crunchy chips for taco bowls and chili.",
    category: "SIDE",
    cuisine: "Mexican",
    estimatedCostCents: 500,
    prepTimeMinutes: 2,
    spiceLevel: "NONE",
    tags: ["vegan", "gluten-free"],
    ingredients: [item("tortilla-chips", 2)]
  }),
  dish({
    id: "peanut-sesame-noodles",
    name: "Peanut sesame noodles",
    description: "Cold noodles with peanut sauce, sesame oil, cucumber, and carrots.",
    category: "SIDE",
    cuisine: "Chinese",
    estimatedCostCents: 1200,
    prepTimeMinutes: 20,
    spiceLevel: "MILD",
    tags: ["vegetarian", "peanut", "gluten"],
    ingredients: [item("wheat-pasta", 1), item("peanut-sauce", 1), item("sesame-oil", 1), item("cucumber", 2), item("carrot", 1)]
  }),
  dish({
    id: "caprese-skewers",
    name: "Caprese skewers",
    description: "Tomatoes and mozzarella for a light side.",
    category: "APPETIZER",
    cuisine: "Italian",
    estimatedCostCents: 1000,
    prepTimeMinutes: 15,
    spiceLevel: "NONE",
    tags: ["vegetarian", "gluten-free", "dairy"],
    ingredients: [item("tomato", 2), item("mozzarella", 1)]
  }),
  dish({
    id: "hummus-vegetables",
    name: "Hummus and vegetables",
    description: "Hummus with cucumber, carrots, and peppers.",
    category: "APPETIZER",
    cuisine: "Mediterranean",
    estimatedCostCents: 950,
    prepTimeMinutes: 12,
    spiceLevel: "NONE",
    tags: ["vegan", "gluten-free"],
    ingredients: [item("hummus", 2), item("cucumber", 2), item("carrot", 1), item("bell-pepper", 2)]
  }),
  dish({
    id: "fruit-platter",
    name: "Fruit platter",
    description: "A shareable tray of seasonal fruit.",
    category: "DESSERT",
    cuisine: "Global",
    estimatedCostCents: 1200,
    prepTimeMinutes: 15,
    spiceLevel: "NONE",
    tags: ["vegan", "gluten-free"],
    ingredients: [item("fruit", 4)]
  }),
  dish({
    id: "brownies",
    name: "Brownies",
    description: "Classic chocolate brownies.",
    category: "DESSERT",
    cuisine: "American",
    estimatedCostCents: 850,
    prepTimeMinutes: 45,
    spiceLevel: "NONE",
    tags: ["vegetarian", "gluten"],
    ingredients: [item("brownie-mix", 1)]
  }),
  dish({
    id: "mochi-dessert",
    name: "Mochi",
    description: "Assorted mochi for a low-prep dessert.",
    category: "DESSERT",
    cuisine: "Japanese",
    estimatedCostCents: 1100,
    prepTimeMinutes: 2,
    spiceLevel: "NONE",
    tags: ["vegetarian", "gluten-free"],
    ingredients: [item("mochi", 2)]
  }),
  dish({
    id: "ice-cream",
    name: "Ice cream",
    description: "Pints of ice cream for sharing.",
    category: "DESSERT",
    cuisine: "American",
    estimatedCostCents: 1000,
    prepTimeMinutes: 2,
    spiceLevel: "NONE",
    tags: ["vegetarian", "gluten-free", "dairy"],
    ingredients: [item("ice-cream", 3)]
  }),
  dish({
    id: "coconut-rice-pudding",
    name: "Coconut rice pudding",
    description: "Coconut milk and rice simmered into a simple dessert.",
    category: "DESSERT",
    cuisine: "Thai",
    estimatedCostCents: 900,
    prepTimeMinutes: 35,
    spiceLevel: "NONE",
    tags: ["vegan", "gluten-free", "rice"],
    ingredients: [item("rice", 1), item("coconut-milk", 2)]
  }),
  dish({
    id: "sparkling-water",
    name: "Sparkling water",
    description: "Cans of unsweetened sparkling water.",
    category: "DRINK",
    cuisine: "Global",
    estimatedCostCents: 900,
    prepTimeMinutes: 1,
    spiceLevel: "NONE",
    supportedEventTypes: ["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"],
    hotpotRole: "DRINK",
    tags: ["vegan", "gluten-free"],
    ingredients: [item("sparkling-water", 2)]
  }),
  dish({
    id: "lemonade",
    name: "Lemonade",
    description: "Bottled lemonade.",
    category: "DRINK",
    cuisine: "Global",
    estimatedCostCents: 700,
    prepTimeMinutes: 1,
    spiceLevel: "NONE",
    supportedEventTypes: ["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"],
    hotpotRole: "DRINK",
    tags: ["vegan", "gluten-free"],
    ingredients: [item("lemonade", 2)]
  }),
  dish({
    id: "iced-tea",
    name: "Iced tea",
    description: "Bottled iced tea.",
    category: "DRINK",
    cuisine: "Global",
    estimatedCostCents: 700,
    prepTimeMinutes: 1,
    spiceLevel: "NONE",
    supportedEventTypes: ["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"],
    hotpotRole: "DRINK",
    tags: ["vegan", "gluten-free"],
    ingredients: [item("iced-tea", 2)]
  }),
  ...gatheringDishCatalog
];

export const demoRoom: DinnerRoom = {
  id: "room-friday-hotpot",
  hostId: demoHost.id,
  title: "Friday Hotpot Night",
  description: "A shared dinner for six with dietary constraints, voting, and assigned shopping.",
  eventType: "HOTPOT",
  dateTime: "2026-06-19T23:30:00.000Z",
  location: "Apartment 4B",
  totalBudgetCents: 12000,
  expectedGuests: 6,
  status: "FINALIZED",
  inviteToken: "friday-hotpot",
  isPublicShareable: true,
  createdAt: now,
  updatedAt: now
};

function guest(input: {
  id: string;
  name: string;
  dietType: Guest["preference"]["dietType"];
  allergies?: string[];
  dislikes?: string[];
  likes?: string[];
  spiceLevel: Guest["preference"]["spiceLevel"];
  canBring?: boolean;
  notes?: string;
}): Guest {
  return {
    id: input.id,
    roomId: demoRoom.id,
    name: input.name,
    isHostGuest: false,
    canBring: input.canBring ?? false,
    createdAt: now,
    updatedAt: now,
    preference: {
      id: `${input.id}-preference`,
      guestId: input.id,
      dietType: input.dietType,
      allergies: input.allergies ?? [],
      dislikes: input.dislikes ?? [],
      likes: input.likes ?? [],
      spiceLevel: input.spiceLevel,
      notes: input.notes
    }
  };
}

export const demoGuests: Guest[] = [
  guest({ id: "guest-alex", name: "Alex", dietType: "OMNIVORE", likes: ["beef", "rice"], spiceLevel: "MEDIUM", canBring: true }),
  guest({ id: "guest-maya", name: "Maya", dietType: "VEGETARIAN", dislikes: ["beef"], likes: ["mushrooms", "tofu"], spiceLevel: "MEDIUM", canBring: true }),
  guest({ id: "guest-jordan", name: "Jordan", dietType: "OMNIVORE", allergies: ["peanut"], likes: ["rice"], spiceLevel: "MILD" }),
  guest({ id: "guest-sam", name: "Sam", dietType: "GLUTEN_FREE", likes: ["chicken"], spiceLevel: "MEDIUM", canBring: true }),
  guest({ id: "guest-priya", name: "Priya", dietType: "HALAL", dislikes: ["pork"], likes: ["curry", "spicy"], spiceLevel: "HOT", canBring: true }),
  guest({ id: "guest-taylor", name: "Taylor", dietType: "OMNIVORE", dislikes: ["seafood"], likes: ["drinks"], spiceLevel: "MILD", canBring: true })
];

export const eventTypes: EventType[] = ["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"];


import type { DinnerRoom, Dish, DishCategory, EventType, Guest, Ingredient, IngredientCategory, SpiceLevel, User } from "@/lib/domain";

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
  { id: "tofu", name: "tofu", category: "DAIRY", defaultUnit: "block", tags: ["soy", "vegan", "vegetarian"] },
  { id: "chickpeas", name: "chickpeas", category: "PANTRY", defaultUnit: "can", tags: ["vegan", "gluten-free"] },
  { id: "black-beans", name: "black beans", category: "PANTRY", defaultUnit: "can", tags: ["vegan", "gluten-free"] },
  { id: "lentils", name: "lentils", category: "PANTRY", defaultUnit: "cup", tags: ["vegan", "gluten-free"] },
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
  tags: string[];
  ingredients: Array<ReturnType<typeof item>>;
}): Dish {
  return {
    baseServings: 4,
    ...input
  };
}

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
    tags: ["vegan", "vegetarian", "gluten-free", "hotpot", "mushroom"],
    ingredients: [item("broth", 2), item("mushrooms", 2), item("tofu", 3), item("bok-choy", 3), item("cabbage", 1), item("tamari", 1)]
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
    tags: ["chicken", "meat", "bbq", "gluten-free"],
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
    tags: ["vegan", "gluten-free"],
    ingredients: [item("iced-tea", 2)]
  })
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
    editToken: `${input.id}-edit-token`,
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

export const eventTypes: EventType[] = ["DINNER", "POTLUCK", "HOTPOT", "BBQ", "PICNIC", "BRUNCH", "OTHER"];


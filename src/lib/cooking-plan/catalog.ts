import type { CookingGuide } from "./types";

/** Original TableSync notes for the exact built-in ingredient sets. */
export const cookingGuides: Readonly<Record<string, CookingGuide>> = {
  "mushroom-hotpot-broth": {
    "ingredientIds": [
      "broth",
      "mushrooms",
      "tofu",
      "bok-choy",
      "cabbage",
      "tamari"
    ],
    "equipment": [
      "Stockpot",
      "Tabletop cooker"
    ],
    "phase": "START",
    "task": "Start the broth; wash and portion tofu and greens.",
    "steps": [
      "Wash and slice mushrooms and greens; drain and cube the tofu. Check the broth and tamari labels against the menu's food restrictions.",
      "Bring the broth to a boil in a stockpot, then simmer the mushrooms until tender. Add tofu to heat through and a little tamari to taste.",
      "Add sturdy cabbage before the tender bok choy. Keep enough broth to cover food, adding water as needed.",
      "Transfer to a suitable tabletop cooker and bring back to a simmer before each batch. Use separate raw-food and serving utensils."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "tomato-hotpot-broth": {
    "ingredientIds": [
      "broth",
      "tomato",
      "onion",
      "garlic"
    ],
    "equipment": [
      "Stockpot",
      "Tabletop cooker"
    ],
    "phase": "START",
    "task": "Simmer the tomato broth before setting out hotpot ingredients.",
    "steps": [
      "Chop tomatoes and onion; peel and finely chop garlic.",
      "Add the vegetables to the broth in a stockpot, bring to a boil, then simmer until tomatoes and onion soften.",
      "Taste the broth before adding anything else; the packaged broth is already seasoned. Add water if needed to keep food covered.",
      "Transfer to a suitable tabletop cooker and keep the broth simmering as batches are added. Follow the temperature guidance for each protein."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "hotpot-tofu": {
    "ingredientIds": [
      "tofu"
    ],
    "equipment": [
      "Knife and board",
      "Tabletop cooker"
    ],
    "phase": "COOK",
    "task": "Drain and portion tofu; cook it in the simmering broth.",
    "steps": [
      "Drain tofu and cut into bite-size pieces that can be lifted safely from the pot.",
      "Keep the platter chilled until the broth and other cooking equipment are ready.",
      "Add small batches to simmering broth and heat through; tofu type and piece size change the cooking time.",
      "Lift with a clean serving utensil and keep it away from raw-meat plates and tongs."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "hotpot-beef-slices": {
    "ingredientIds": [
      "beef"
    ],
    "equipment": [
      "Raw-meat board",
      "Tabletop cooker",
      "Food thermometer"
    ],
    "phase": "COOK",
    "task": "Keep beef chilled and cook small batches with separate utensils.",
    "steps": [
      "Use thinly sliced whole-cut beef, kept chilled; cut larger pieces on a board reserved for raw meat.",
      "Arrange small raw portions on a separate plate, away from cooked food, vegetables and dipping sauces.",
      "Add small batches to simmering broth, let the broth recover, and cook thoroughly. Do not use a fixed dipping time as a safety check.",
      "Check safe temperature and rest guidance for whole-cut beef below; use clean serving tongs and never return cooked beef to its raw plate."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "hotpot-chicken-slices": {
    "ingredientIds": [
      "chicken"
    ],
    "equipment": [
      "Raw-meat board",
      "Tabletop cooker",
      "Food thermometer"
    ],
    "phase": "COOK",
    "task": "Cook chicken thoroughly in small batches; keep raw platters separate.",
    "steps": [
      "Keep chicken chilled and cut evenly on a board reserved for raw poultry. Do not wash raw chicken.",
      "Put out only the portion about to be cooked; keep the rest refrigerated.",
      "Cook small batches in simmering broth until chicken reaches 74°C / 165°F. Let the broth recover between batches; color alone is not a safety check.",
      "Transfer cooked chicken with clean serving tongs. Wash hands and keep raw utensils away from sauces and finished food."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "hotpot-mushroom-platter": {
    "ingredientIds": [
      "mushrooms"
    ],
    "equipment": [
      "Knife and board",
      "Tabletop cooker"
    ],
    "phase": "COOK",
    "task": "Trim mushrooms and add them to the broth before tender greens.",
    "steps": [
      "Clean mushrooms, trim tough ends and cut into similar-size pieces.",
      "Keep the prepared platter chilled until the cooker is ready.",
      "Add mushrooms in small batches to simmering broth and cook until tender; different varieties need different times.",
      "Use a clean serving utensil and keep the platter away from raw-meat juices."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "hotpot-leafy-greens": {
    "ingredientIds": [
      "bok-choy",
      "cabbage"
    ],
    "equipment": [
      "Colander",
      "Knife and board",
      "Tabletop cooker"
    ],
    "phase": "FINISH",
    "task": "Wash greens thoroughly; cook sturdy stems before leaves.",
    "steps": [
      "Separate leaves and wash away grit; cut cabbage and bok choy stems into manageable pieces.",
      "Drain and keep chilled, separated from raw protein platters.",
      "Add cabbage and thick stems to simmering broth first. Add tender leaves later and cook until wilted and tender.",
      "Lift with a clean serving utensil; prepare small batches rather than leaving uncooked greens beside raw-meat plates."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "hotpot-garlic-tamari-sauce": {
    "ingredientIds": [
      "tamari",
      "garlic",
      "sesame-oil"
    ],
    "equipment": [
      "Small bowls"
    ],
    "phase": "FINISH",
    "task": "Mix small tasting portions of dipping sauce.",
    "steps": [
      "Peel and finely mince garlic; check tamari and sesame-oil labels for your guests' food restrictions.",
      "Mix a small amount of tamari with a little minced garlic and a few drops of sesame oil; thin with water if too salty.",
      "Taste and adjust in small amounts. Bottle counts in the ingredient list are shopping estimates, not quantities to pour into one sauce.",
      "Serve in individual bowls with clean spoons and keep raw-meat utensils out of the sauce."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "hotpot-ginger-sesame-sauce": {
    "ingredientIds": [
      "ginger",
      "sesame-oil",
      "tamari"
    ],
    "equipment": [
      "Grater",
      "Small bowls"
    ],
    "phase": "FINISH",
    "task": "Grate ginger and make individual dipping bowls.",
    "steps": [
      "Peel and finely grate ginger; check tamari and sesame-oil labels for food restrictions.",
      "Mix a little tamari, grated ginger and a few drops of sesame oil, thinning with water to taste.",
      "Make small portions first. The listed bottles are shopping estimates and should not all be used in one batch.",
      "Serve separately in individual bowls and keep raw-food utensils out of the sauce."
    ],
    "referenceIds": [
      "hotpot"
    ]
  },
  "chicken-taco-bowl": {
    "ingredientIds": [
      "rice",
      "chicken",
      "black-beans",
      "bell-pepper",
      "avocado",
      "tomato"
    ],
    "equipment": [
      "Saucepan",
      "Oven tray",
      "Food thermometer"
    ],
    "phase": "START",
    "task": "Start rice and cook chicken before assembling the bowls.",
    "steps": [
      "Start the rice with the water ratio and method on its package. Drain and rinse beans; slice peppers and chop tomatoes.",
      "Roast evenly sized chicken pieces and peppers on a lined tray at 200°C / 400°F, keeping raw poultry separate from fresh toppings.",
      "Check chicken reaches 74°C / 165°F; warm beans in a small pan with a splash of water. Chop avocado close to serving.",
      "Serve rice, chicken, beans, peppers, tomato and avocado separately or in bowls. Follow the menu's spice-adjustment notes."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "vegetarian-pasta-bake": {
    "ingredientIds": [
      "wheat-pasta",
      "tomato",
      "spinach",
      "mushrooms",
      "mozzarella"
    ],
    "equipment": [
      "Saucepan",
      "Baking dish",
      "Oven"
    ],
    "phase": "START",
    "task": "Boil pasta and prepare the vegetables before baking.",
    "steps": [
      "Heat the oven to 190°C / 375°F. Boil pasta in water according to the package, stopping just before fully tender; reserve some pasta water.",
      "Slice mushrooms and chop tomatoes. Simmer them with a little water until the mushrooms are cooked and the tomatoes soften, then wilt spinach.",
      "Mix pasta and vegetables in a baking dish, adding reserved water if dry. Scatter mozzarella over the top.",
      "Bake until bubbling throughout and the center reaches 74°C / 165°F. Rest briefly before portioning; larger batches need more dishes and time."
    ],
    "referenceIds": []
  },
  "gluten-free-pasta-bake": {
    "ingredientIds": [
      "gluten-free-pasta",
      "tomato",
      "spinach",
      "mushrooms",
      "mozzarella"
    ],
    "equipment": [
      "Saucepan",
      "Baking dish",
      "Oven"
    ],
    "phase": "START",
    "task": "Use the gluten-free pasta's packet timing before baking.",
    "steps": [
      "Heat the oven to 190°C / 375°F. Cook gluten-free pasta in water using its package instructions; avoid overcooking and reserve pasta water.",
      "Slice mushrooms and chop tomatoes. Simmer with a little water until the mushrooms are cooked and tomatoes soften, then add spinach.",
      "Combine the drained pasta and vegetables in a baking dish; loosen with pasta water if needed. Top with mozzarella.",
      "Bake until bubbling throughout and the center reaches 74°C / 165°F. Rest before serving and keep gluten-containing utensils away."
    ],
    "referenceIds": []
  },
  "beef-bulgogi-rice-bowl": {
    "ingredientIds": [
      "rice",
      "beef",
      "cucumber",
      "kimchi",
      "soy-sauce",
      "sesame-oil"
    ],
    "equipment": [
      "Saucepan",
      "Nonstick skillet",
      "Food thermometer"
    ],
    "phase": "START",
    "task": "Start rice; prepare fresh toppings separately from raw beef.",
    "steps": [
      "Start rice using its package water ratio. Slice cucumber and portion kimchi with clean utensils.",
      "Cut whole-cut beef into thin strips on a raw-meat board. Coat lightly with a small amount of soy sauce and a few drops of sesame oil.",
      "Cook beef in a hot nonstick skillet in small batches, turning to cook evenly. Follow the whole-cut beef temperature and rest guidance below.",
      "Build bowls with rice, rested beef, cucumber and kimchi. Keep kimchi and additional sauce separate when the menu calls for a milder meal."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "chickpea-curry": {
    "ingredientIds": [
      "chickpeas",
      "coconut-milk",
      "curry-paste",
      "carrot",
      "spinach",
      "rice"
    ],
    "equipment": [
      "Saucepan",
      "Deep skillet"
    ],
    "phase": "START",
    "task": "Start rice, then simmer the curry's vegetables.",
    "steps": [
      "Start rice using its package instructions. Drain and rinse chickpeas; slice carrots thinly and wash spinach.",
      "Simmer carrots in coconut milk with a little water until tender. Add chickpeas and warm through.",
      "Stir in spinach to wilt. Use curry paste according to its package's cooking instructions. For a mild shared base, reserve a little of the listed coconut milk and prepare a separate cooked sauce with the paste.",
      "Serve over rice. Check the curry-paste label for allergens and use the menu's adjustment notes."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "salmon-rice-bowl": {
    "ingredientIds": [
      "salmon",
      "rice",
      "cucumber",
      "avocado",
      "tamari"
    ],
    "equipment": [
      "Saucepan",
      "Oven tray",
      "Food thermometer"
    ],
    "phase": "START",
    "task": "Start rice and roast salmon; slice toppings near serving.",
    "steps": [
      "Start rice using the package water ratio. Keep raw salmon chilled and separate from the cucumber and avocado.",
      "Put salmon on a lined tray and roast at 200°C / 400°F until it reaches 63°C / 145°F in the thickest part; time depends on thickness.",
      "Slice cucumber and avocado using a clean board and utensils. Portion a little tamari for serving rather than using a whole shopping bottle.",
      "Serve rice and salmon with the fresh toppings and tamari on the side."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "build-your-own-taco-night": {
    "ingredientIds": [
      "corn-tortillas",
      "black-beans",
      "bell-pepper",
      "cheese",
      "chicken",
      "avocado"
    ],
    "equipment": [
      "Skillet",
      "Oven tray",
      "Food thermometer"
    ],
    "phase": "COOK",
    "task": "Cook chicken and peppers; warm tortillas last.",
    "steps": [
      "Drain and rinse beans; cut peppers, grate cheese and prepare separate topping bowls. Keep raw chicken away from ready-to-eat ingredients.",
      "Roast chicken and peppers on a lined tray at 200°C / 400°F, checking the chicken reaches 74°C / 165°F. Warm beans with a little water.",
      "Warm corn tortillas in a dry skillet according to the package. Slice avocado close to serving.",
      "Set out separate bowls of chicken, beans, peppers, cheese and avocado. Keep dietary alternatives and their utensils separate."
    ],
    "referenceIds": []
  },
  "tofu-vegetable-stir-fry": {
    "ingredientIds": [
      "tofu",
      "broccoli",
      "carrot",
      "mushrooms",
      "rice",
      "tamari"
    ],
    "equipment": [
      "Saucepan",
      "Nonstick skillet"
    ],
    "phase": "START",
    "task": "Start rice and drain tofu before stir-frying.",
    "steps": [
      "Start rice using its package water ratio. Drain tofu and pat it dry; cut tofu and vegetables into similar-size pieces.",
      "Cook tofu in a nonstick skillet, turning to firm the surfaces. Add carrots, broccoli and a splash of water; cover briefly to steam until nearly tender.",
      "Add mushrooms and cook until tender, uncovering to let excess water evaporate. Add a little tamari to taste.",
      "Serve over rice. Work in batches instead of crowding the pan and keep extra sauce separate."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "black-bean-chili": {
    "ingredientIds": [
      "black-beans",
      "tomato",
      "bell-pepper",
      "onion",
      "garlic"
    ],
    "equipment": [
      "Large saucepan"
    ],
    "phase": "START",
    "task": "Simmer the tomato, pepper and bean pot first.",
    "steps": [
      "Drain and rinse black beans; chop tomatoes, peppers and onion, and mince peeled garlic.",
      "Soften onion, garlic and peppers in a saucepan with a little water, stirring to prevent sticking.",
      "Add tomatoes and beans, then simmer until the vegetables are tender and the sauce thickens, adding water if needed.",
      "Serve hot. No extra chili or seasoning is assumed by this guide; follow the menu's spice-adjustment notes."
    ],
    "referenceIds": []
  },
  "bbq-chicken-skewers": {
    "ingredientIds": [
      "chicken",
      "bell-pepper",
      "onion",
      "garlic"
    ],
    "equipment": [
      "Skewers",
      "Grill",
      "Food thermometer"
    ],
    "phase": "COOK",
    "task": "Prepare raw chicken separately and grill evenly sized skewers.",
    "steps": [
      "Soak wooden skewers if their package requires it. Cut chicken, peppers and onion into similar-size pieces; mince peeled garlic.",
      "Keep raw chicken chilled. Thread chicken separately from vegetable skewers so each can be cooked and handled safely.",
      "Grill over medium heat, turning regularly. Cook chicken to 74°C / 165°F; grill vegetables until tender, using garlic sparingly so it does not burn.",
      "Use clean tongs and a clean serving plate for cooked chicken. Do not reuse the raw chicken plate or juices."
    ],
    "referenceIds": []
  },
  "shrimp-fajitas": {
    "ingredientIds": [
      "shrimp",
      "corn-tortillas",
      "bell-pepper",
      "onion",
      "avocado"
    ],
    "equipment": [
      "Skillet",
      "Knife and board"
    ],
    "phase": "COOK",
    "task": "Cook peppers and shrimp; warm tortillas and cut avocado last.",
    "steps": [
      "Thaw shrimp safely in the refrigerator, peel if needed and keep chilled. Slice peppers and onion on a clean board.",
      "Soften peppers and onion in a nonstick skillet with a splash of water. Add shrimp in small batches and cook until pearly or white and opaque throughout.",
      "Warm corn tortillas in a dry skillet according to their package; slice avocado with clean utensils.",
      "Serve immediately with separate topping bowls. Keep raw shrimp utensils away from ready-to-eat tortillas and avocado."
    ],
    "referenceIds": []
  },
  "cucumber-salad": {
    "ingredientIds": [
      "cucumber",
      "ginger",
      "tamari",
      "sesame-oil"
    ],
    "equipment": [
      "Knife and board",
      "Mixing bowl"
    ],
    "phase": "FINISH",
    "task": "Slice cucumbers and add a small amount of ginger dressing.",
    "steps": [
      "Wash and slice cucumbers; peel and grate ginger.",
      "Mix a little tamari, ginger and a few drops of sesame oil; add water if the dressing is too salty.",
      "Toss with the cucumber just before serving, adding dressing gradually. Bottle counts are shopping amounts, not a dressing ratio.",
      "Keep chilled until serving and use clean utensils."
    ],
    "referenceIds": []
  },
  "garlic-bread": {
    "ingredientIds": [
      "bread",
      "garlic",
      "cheese"
    ],
    "equipment": [
      "Baking tray",
      "Oven"
    ],
    "phase": "FINISH",
    "task": "Toast the garlic and cheese bread just before serving.",
    "steps": [
      "Heat the oven to 190°C / 375°F. Slice bread and finely mince peeled garlic; grate cheese if needed.",
      "Distribute a small amount of garlic across the bread, then cover with cheese.",
      "Bake on a tray until the bread is crisp and the cheese is melted, checking often so garlic and edges do not burn.",
      "Cut into serving pieces and serve warm. This guide does not add butter or any other unlisted ingredients."
    ],
    "referenceIds": []
  },
  "roasted-vegetables": {
    "ingredientIds": [
      "carrot",
      "broccoli",
      "bell-pepper",
      "onion",
      "garlic"
    ],
    "equipment": [
      "Baking tray",
      "Oven"
    ],
    "phase": "COOK",
    "task": "Roast the firmer vegetables first, with room on the tray.",
    "steps": [
      "Heat the oven to 200°C / 400°F. Wash and cut carrots, broccoli, peppers and onion into similar-size pieces; peel garlic.",
      "Arrange carrots, onion and garlic on a lined tray with a splash of water; cover initially to help the firmer vegetables soften.",
      "Add broccoli and peppers, uncover and roast until tender, turning and adding a little water if needed to prevent drying.",
      "Serve hot. Use more trays for large portions; this catalog recipe does not include cooking oil."
    ],
    "referenceIds": []
  },
  "kimchi-side": {
    "ingredientIds": [
      "kimchi"
    ],
    "equipment": [
      "Serving bowl"
    ],
    "phase": "FINISH",
    "task": "Keep packaged kimchi chilled and serve it separately.",
    "steps": [
      "Check the kimchi label against guests' allergies and diets; some products contain fish or other allergens.",
      "Keep it refrigerated according to the label until close to serving.",
      "Portion with a clean spoon into a separate bowl.",
      "Serve it on the side, especially if the menu has a spice adjustment."
    ],
    "referenceIds": []
  },
  "steamed-rice": {
    "ingredientIds": [
      "rice"
    ],
    "equipment": [
      "Saucepan with lid"
    ],
    "phase": "START",
    "task": "Cook rice using the purchased variety's water ratio.",
    "steps": [
      "Measure the planned dry rice; rinse if the package recommends it.",
      "Add the water ratio specified for your rice variety to a suitable saucepan or rice cooker.",
      "Cook covered using the package method, then rest as directed before fluffing. Use a larger pot or batches as portions increase.",
      "Serve promptly, keep safely hot, or cool promptly in shallow containers and refrigerate for a chilled dish."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "tortilla-chips-side": {
    "ingredientIds": [
      "tortilla-chips"
    ],
    "equipment": [
      "Serving bowl"
    ],
    "phase": "FINISH",
    "task": "Check chip labels and set out clean serving bowls.",
    "steps": [
      "Check the package for ingredients and cross-contact warnings relevant to the menu.",
      "Keep the chips sealed until serving so they stay crisp.",
      "Pour into a clean bowl and provide a serving scoop when shared.",
      "Keep dietary alternatives in separate bowls with their own utensils."
    ],
    "referenceIds": []
  },
  "peanut-sesame-noodles": {
    "ingredientIds": [
      "wheat-pasta",
      "peanut-sauce",
      "sesame-oil",
      "cucumber",
      "carrot"
    ],
    "equipment": [
      "Saucepan",
      "Mixing bowl"
    ],
    "phase": "COOK",
    "task": "Cook noodles; slice vegetables and dress close to serving.",
    "steps": [
      "Cook pasta according to its package and reserve a little cooking water. Wash and thinly slice cucumber and carrot.",
      "Mix a small amount of peanut sauce with a few drops of sesame oil and enough pasta water to loosen it.",
      "Toss the cooked pasta and vegetables with dressing, adding more gradually; jar and bottle counts are shopping quantities.",
      "Serve promptly or cool promptly and refrigerate. Keep this peanut, sesame and wheat dish and its utensils separate from other food."
    ],
    "referenceIds": []
  },
  "caprese-skewers": {
    "ingredientIds": [
      "tomato",
      "mozzarella"
    ],
    "equipment": [
      "Skewers",
      "Knife and board"
    ],
    "phase": "FINISH",
    "task": "Assemble tomato and mozzarella skewers with clean utensils.",
    "steps": [
      "Wash tomatoes and cut into bite-size pieces if needed; drain and portion mozzarella.",
      "Thread tomato and mozzarella onto clean skewers.",
      "Cover and refrigerate until close to serving.",
      "Put out small batches with clean serving utensils; this guide does not add basil or dressing."
    ],
    "referenceIds": []
  },
  "hummus-vegetables": {
    "ingredientIds": [
      "hummus",
      "cucumber",
      "carrot",
      "bell-pepper"
    ],
    "equipment": [
      "Knife and board",
      "Serving platter"
    ],
    "phase": "FINISH",
    "task": "Cut vegetables and serve the purchased hummus chilled.",
    "steps": [
      "Check the purchased hummus label for sesame and any other allergens; follow its storage instructions.",
      "Wash and cut cucumber, carrot and peppers into sticks.",
      "Portion the hummus into a clean bowl and arrange the vegetables alongside.",
      "Keep chilled until serving; put out small batches and use clean utensils."
    ],
    "referenceIds": []
  },
  "fruit-platter": {
    "ingredientIds": [
      "fruit"
    ],
    "equipment": [
      "Knife and board",
      "Serving platter"
    ],
    "phase": "FINISH",
    "task": "Wash and cut the purchased fruit close to serving.",
    "steps": [
      "Wash fruit under running water and use a clean board separate from raw meat.",
      "Peel, remove stones or cores as needed and cut into pieces suitable for your guests.",
      "Arrange on a clean platter, without adding unlisted dressing.",
      "Keep cut fruit chilled until serving and set out small batches."
    ],
    "referenceIds": [
      "fruit"
    ]
  },
  "brownies": {
    "ingredientIds": [
      "brownie-mix"
    ],
    "equipment": [
      "Equipment listed on package"
    ],
    "phase": "START",
    "task": "Read the mix instructions and confirm any missing ingredients.",
    "steps": [
      "Read the chosen mix's ingredients, required additions, oven temperature and pan-size instructions before starting.",
      "The catalog lists only the mix. If it requires eggs, oil or other additions, review the shopping list and food restrictions with the host first.",
      "Prepare and bake only once all required ingredients are covered, following the package's quantities and doneness instructions.",
      "Cool as directed before cutting; keep packaging available so guests can check allergens."
    ],
    "referenceIds": [],
    "notice": "Package directions required. A box of mix alone is not necessarily a complete brownie recipe."
  },
  "mochi-dessert": {
    "ingredientIds": [
      "mochi"
    ],
    "equipment": [
      "Serving plate"
    ],
    "phase": "FINISH",
    "task": "Follow the mochi package's thawing and serving instructions.",
    "steps": [
      "Check the product's ingredients, allergen warnings and storage instructions.",
      "Keep frozen or chilled as its label directs.",
      "Thaw or portion only as instructed on the package.",
      "Serve in pieces suitable for your guests, using clean utensils."
    ],
    "referenceIds": []
  },
  "ice-cream": {
    "ingredientIds": [
      "ice-cream"
    ],
    "equipment": [
      "Freezer",
      "Serving scoop"
    ],
    "phase": "FINISH",
    "task": "Keep ice cream frozen and scoop at serving time.",
    "steps": [
      "Check each product's ingredients and cross-contact warnings against the menu.",
      "Keep tubs frozen until serving.",
      "Use a separate clean scoop for each dietary alternative.",
      "Put out small portions and follow package instructions for any softened leftovers."
    ],
    "referenceIds": []
  },
  "coconut-rice-pudding": {
    "ingredientIds": [
      "rice",
      "coconut-milk"
    ],
    "equipment": [
      "Saucepan"
    ],
    "phase": "START",
    "task": "Simmer the rice pudding early and allow time to cool if needed.",
    "steps": [
      "Measure the planned dry rice and rinse if its package recommends it.",
      "Simmer rice in coconut milk with enough water to reach the rice package's liquid ratio; stir frequently to prevent sticking.",
      "Cook until the rice is fully tender, adding water gradually if it dries out. This guide does not assume added sugar.",
      "Serve warm, or cool promptly in shallow containers and refrigerate until serving."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "sparkling-water": {
    "ingredientIds": [
      "sparkling-water"
    ],
    "equipment": [
      "Refrigerator",
      "Serving glasses"
    ],
    "phase": "FINISH",
    "task": "Chill the packaged drinks and set out clean glasses.",
    "steps": [
      "Check labels for ingredients relevant to your guests.",
      "Chill sealed drinks according to their packaging.",
      "Open and serve close to mealtime in clean glasses.",
      "Refrigerate opened containers as directed; use clean pouring utensils."
    ],
    "referenceIds": []
  },
  "lemonade": {
    "ingredientIds": [
      "lemonade"
    ],
    "equipment": [
      "Refrigerator",
      "Serving glasses"
    ],
    "phase": "FINISH",
    "task": "Chill the packaged drinks and set out clean glasses.",
    "steps": [
      "Check labels for ingredients relevant to your guests.",
      "Chill sealed drinks according to their packaging.",
      "Open and serve close to mealtime in clean glasses.",
      "Refrigerate opened containers as directed; use clean pouring utensils."
    ],
    "referenceIds": []
  },
  "iced-tea": {
    "ingredientIds": [
      "iced-tea"
    ],
    "equipment": [
      "Refrigerator",
      "Serving glasses"
    ],
    "phase": "FINISH",
    "task": "Chill the packaged drinks and set out clean glasses.",
    "steps": [
      "Check labels for ingredients relevant to your guests.",
      "Chill sealed drinks according to their packaging.",
      "Open and serve close to mealtime in clean glasses.",
      "Refrigerate opened containers as directed; use clean pouring utensils."
    ],
    "referenceIds": []
  },
  "lentil-rice-bake": {
    "ingredientIds": [
      "lentils",
      "rice",
      "carrot",
      "tomato",
      "olive-oil"
    ],
    "equipment": [
      "Saucepans",
      "Baking dish",
      "Oven"
    ],
    "phase": "START",
    "task": "Cook lentils and rice before assembling the bake.",
    "steps": [
      "Cook dry lentils and rice separately using their package water ratios and timings. Allow extra time for the variety purchased.",
      "Heat the oven to 190°C / 375°F. Dice carrots, chop tomatoes and soften them in olive oil with a little water.",
      "Mix fully cooked lentils and rice with the vegetables in a baking dish. Add enough cooking liquid to keep the mixture moist.",
      "Bake until hot throughout and the center reaches 74°C / 165°F. Rest briefly and portion; use more baking dishes for larger batches."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "chickpea-potato-casserole": {
    "ingredientIds": [
      "chickpeas",
      "potatoes",
      "spinach",
      "tomato",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Baking dish",
      "Oven"
    ],
    "phase": "START",
    "task": "Parboil potatoes before finishing the casserole.",
    "steps": [
      "Drain and rinse chickpeas; wash and dice potatoes. Boil potatoes in water until nearly tender, then drain.",
      "Heat the oven to 190°C / 375°F. Chop tomatoes and wash spinach.",
      "Combine potatoes, chickpeas, tomatoes, spinach and olive oil in a baking dish with a little water to prevent drying.",
      "Cover and bake until potatoes are tender and the center reaches 74°C / 165°F; uncover briefly if desired before serving."
    ],
    "referenceIds": []
  },
  "chicken-rice-tray": {
    "ingredientIds": [
      "chicken",
      "rice",
      "bell-pepper",
      "fresh-herbs",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Oven tray",
      "Food thermometer"
    ],
    "phase": "START",
    "task": "Start rice and roast the chicken and peppers.",
    "steps": [
      "Start rice using its package water ratio. Heat the oven to 200°C / 400°F; slice peppers and wash and chop parsley.",
      "Place evenly sized chicken pieces and peppers on a tray with olive oil. Keep raw poultry away from the parsley and finished rice.",
      "Roast until the chicken reaches 74°C / 165°F in the thickest part; the cut and thickness determine cooking time.",
      "Combine cooked rice, peppers, chicken and parsley in a serving tray. Use clean utensils and serve promptly."
    ],
    "referenceIds": [
      "rice",
      "chickenRice"
    ]
  },
  "vegetable-pasta-tray": {
    "ingredientIds": [
      "wheat-pasta",
      "broccoli",
      "tomato",
      "mozzarella",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Baking dish",
      "Oven"
    ],
    "phase": "START",
    "task": "Cook pasta and broccoli before heating the tray.",
    "steps": [
      "Heat the oven to 190°C / 375°F. Cook pasta according to the package, adding bite-size broccoli near the end so it becomes tender; reserve pasta water.",
      "Chop tomatoes and combine with drained pasta, broccoli and olive oil in a baking dish.",
      "Add a little reserved water if dry and top with mozzarella.",
      "Bake until hot throughout and the center reaches 74°C / 165°F, with melted cheese. Rest briefly before serving."
    ],
    "referenceIds": []
  },
  "grilled-lentil-patties": {
    "ingredientIds": [
      "lentils",
      "potatoes",
      "rice",
      "onion",
      "olive-oil"
    ],
    "equipment": [
      "Saucepans",
      "Grill-safe flat tray"
    ],
    "phase": "START",
    "task": "Cook lentils, potatoes and rice; form firm patties before grilling.",
    "steps": [
      "Cook dry lentils and rice separately according to their packages. Boil diced potatoes until soft; drain everything thoroughly.",
      "Mash potatoes and lentils together with finely chopped onion. Let the mixture cool enough to handle and form small, compact patties.",
      "Brush with olive oil and cook on a grill-safe flat tray over medium heat, turning only after the surface firms. A tray keeps these flour-free patties from falling through the grate.",
      "Serve hot with rice. If the mixture does not hold, cook it as a lentil-potato hash on the same tray rather than adding unlisted binders."
    ],
    "referenceIds": [
      "rice"
    ],
    "notice": "Dry pulses need cooking time before the patties are formed; the catalog time does not cover every variety."
  },
  "grilled-chickpea-peppers": {
    "ingredientIds": [
      "bell-pepper",
      "chickpeas",
      "quinoa",
      "fresh-herbs",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Grill-safe tray"
    ],
    "phase": "START",
    "task": "Cook quinoa before filling the peppers.",
    "steps": [
      "Rinse and cook quinoa using its package instructions. Drain and rinse chickpeas; wash and chop parsley.",
      "Halve peppers lengthwise and remove seeds. Combine cooked quinoa, chickpeas, parsley and olive oil.",
      "Fill the pepper halves and put them on a grill-safe tray. Grill covered over medium heat until the peppers are tender and the filling is hot throughout.",
      "Serve promptly with clean utensils; cook in batches if the grill is crowded."
    ],
    "referenceIds": [
      "quinoa",
      "vegetables"
    ]
  },
  "grilled-tofu-rice": {
    "ingredientIds": [
      "tofu",
      "mushrooms",
      "rice",
      "tamari",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Skewers",
      "Grill"
    ],
    "phase": "START",
    "task": "Start rice, drain tofu and prepare the grill.",
    "steps": [
      "Start rice using the package instructions. Drain firm tofu, pat dry and press according to its package; cut tofu and mushrooms into sturdy pieces.",
      "Coat lightly with olive oil and a small amount of tamari. Soak wooden skewers if the package requires it, then thread the pieces.",
      "Grill over medium heat, turning gently until tofu is heated through and the mushrooms are tender. Use a grill-safe tray if tofu is too fragile for skewers.",
      "Serve hot over rice with extra tamari separately. Do not add the external recipe's optional sesame dressing."
    ],
    "referenceIds": [
      "rice",
      "tofu",
      "vegetables"
    ]
  },
  "picnic-chickpea-quinoa": {
    "ingredientIds": [
      "quinoa",
      "chickpeas",
      "cucumber",
      "lemon",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Shallow containers",
      "Cooler"
    ],
    "phase": "START",
    "task": "Cook quinoa early, cool promptly and chill the picnic bowls.",
    "steps": [
      "Cook quinoa using its package water ratio; drain and rinse chickpeas.",
      "Cool cooked quinoa promptly in shallow containers and refrigerate. Wash and dice cucumber; juice the lemon.",
      "Mix chilled quinoa, chickpeas and cucumber with olive oil and lemon juice, adding the dressing gradually.",
      "Pack in clean containers and keep cold in an insulated cooler with ice packs until serving."
    ],
    "referenceIds": [
      "quinoa"
    ]
  },
  "picnic-chicken-rice": {
    "ingredientIds": [
      "chicken",
      "rice",
      "carrot",
      "fresh-herbs",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Oven tray",
      "Thermometer",
      "Cooler"
    ],
    "phase": "START",
    "task": "Cook chicken and rice, then chill promptly before packing.",
    "steps": [
      "Cook rice using its package instructions. Roast chicken at 200°C / 400°F, checking it reaches 74°C / 165°F; use clean utensils for the cooked meat.",
      "Cool rice and chicken promptly in separate shallow containers and refrigerate. Allow additional chilling time beyond the catalog estimate.",
      "Wash and grate carrot and chop parsley on a clean board. Combine chilled rice and chicken with carrot, parsley and olive oil.",
      "Pack into clean containers and transport in a cooler with ice packs, keeping the food at 4°C / 40°F or below."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "picnic-lentil-wraps": {
    "ingredientIds": [
      "tortillas",
      "lentils",
      "cabbage",
      "avocado",
      "lemon"
    ],
    "equipment": [
      "Saucepan",
      "Knife and board",
      "Cooler"
    ],
    "phase": "START",
    "task": "Cook and chill lentils before assembling the wraps.",
    "steps": [
      "Cook dry lentils in water using their package directions, then drain, cool promptly in shallow containers and refrigerate.",
      "Wash and shred cabbage. Mash avocado with a little lemon juice close to assembling.",
      "Spread avocado on the tortillas and add chilled lentils and cabbage; roll tightly without adding unlisted dressing.",
      "Wrap and refrigerate, then transport in a cooler with ice packs. Allow extra time for cooking and chilling lentils."
    ],
    "referenceIds": []
  },
  "picnic-bean-corn-wraps": {
    "ingredientIds": [
      "corn-tortillas",
      "black-beans",
      "rice",
      "carrot",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Skillet",
      "Cooler"
    ],
    "phase": "START",
    "task": "Cook and chill rice before preparing the picnic wraps.",
    "steps": [
      "Cook rice according to its package, cool promptly in shallow containers and refrigerate. Drain and rinse black beans; wash and grate carrot.",
      "Warm corn tortillas according to the packet so they fold without cracking, then let them cool.",
      "Fill with chilled rice, beans, carrot and a little olive oil. Fold gently; if the tortilla cannot hold the filling, pack components separately.",
      "Refrigerate and transport in an insulated cooler with ice packs until serving."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "brunch-chickpea-hash": {
    "ingredientIds": [
      "chickpeas",
      "potatoes",
      "bell-pepper",
      "spinach",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Large skillet"
    ],
    "phase": "COOK",
    "task": "Soften potatoes first, then finish the hash in a skillet.",
    "steps": [
      "Drain and rinse chickpeas; dice washed potatoes and peppers. Wash spinach.",
      "Boil potatoes in water until nearly tender, then drain well.",
      "Heat olive oil in a large skillet; cook potatoes and peppers until tender, then add chickpeas to heat through.",
      "Add spinach last to wilt. Serve hot, using batches rather than crowding the pan."
    ],
    "referenceIds": []
  },
  "brunch-vegetable-frittata": {
    "ingredientIds": [
      "eggs",
      "potatoes",
      "spinach",
      "tomato",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Oven-safe skillet",
      "Thermometer"
    ],
    "phase": "COOK",
    "task": "Cook potatoes before setting the eggs and vegetables.",
    "steps": [
      "Heat the oven to 180°C / 350°F. Dice and boil potatoes until tender, drain well; wash spinach and chop tomatoes.",
      "Warm olive oil in an oven-safe skillet; add potatoes and tomatoes, then spinach to wilt.",
      "Beat eggs and pour evenly over the vegetables. Cook gently until the edges set, then transfer the oven-safe pan to the oven.",
      "Bake until the center reaches 71°C / 160°F and the eggs are set. Use an oven glove for the hot handle and rest briefly before slicing."
    ],
    "referenceIds": []
  },
  "brunch-avocado-bean-toast": {
    "ingredientIds": [
      "bread",
      "chickpeas",
      "avocado",
      "lemon"
    ],
    "equipment": [
      "Toaster",
      "Mixing bowl"
    ],
    "phase": "FINISH",
    "task": "Mash the topping and toast bread just before serving.",
    "steps": [
      "Drain and rinse chickpeas; mash them in a bowl.",
      "Mash avocado with the chickpeas and add lemon juice gradually to taste.",
      "Toast sliced bread and spread the mixture on while the toast is crisp.",
      "Serve promptly with clean utensils; prepare small batches so the toast does not become soggy."
    ],
    "referenceIds": []
  },
  "brunch-tofu-scramble": {
    "ingredientIds": [
      "tofu",
      "rice",
      "mushrooms",
      "spinach",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Skillet"
    ],
    "phase": "START",
    "task": "Start rice and prepare the scramble near serving.",
    "steps": [
      "Start rice using its package water ratio. Drain tofu and crumble it; wash spinach and slice mushrooms.",
      "Heat olive oil in a skillet and cook mushrooms until tender.",
      "Add crumbled tofu and heat through, then add spinach to wilt. Let excess liquid evaporate without drying the tofu.",
      "Serve hot over rice. This guide does not add egg, milk or unlisted seasonings."
    ],
    "referenceIds": [
      "rice"
    ]
  },
  "herb-potato-salad": {
    "ingredientIds": [
      "potatoes",
      "lemon",
      "fresh-herbs",
      "olive-oil"
    ],
    "equipment": [
      "Saucepan",
      "Shallow containers"
    ],
    "phase": "START",
    "task": "Boil potatoes, then cool and chill the salad.",
    "steps": [
      "Wash potatoes, cut into similar-size pieces and boil in water until tender; drain.",
      "Wash and chop parsley. Mix olive oil with lemon juice, adding juice gradually to taste.",
      "Toss potatoes with the dressing and parsley. Cool promptly in shallow containers and refrigerate.",
      "Serve chilled with clean utensils; use an insulated cooler with ice packs when transporting."
    ],
    "referenceIds": []
  },
  "carrot-cabbage-slaw": {
    "ingredientIds": [
      "carrot",
      "cabbage",
      "lemon",
      "olive-oil"
    ],
    "equipment": [
      "Knife and board",
      "Mixing bowl"
    ],
    "phase": "FINISH",
    "task": "Shred the vegetables and dress the slaw close to serving.",
    "steps": [
      "Wash and grate carrots; remove damaged cabbage leaves, wash and shred cabbage.",
      "Mix a little lemon juice with olive oil, adding lemon gradually to taste.",
      "Toss the vegetables with the dressing and keep chilled.",
      "Serve with clean utensils; transport in a cooler with ice packs when needed."
    ],
    "referenceIds": []
  },
  "cucumber-chickpea-salad": {
    "ingredientIds": [
      "cucumber",
      "chickpeas",
      "fresh-herbs",
      "lemon",
      "olive-oil"
    ],
    "equipment": [
      "Colander",
      "Mixing bowl"
    ],
    "phase": "FINISH",
    "task": "Drain beans and chop the salad close to serving.",
    "steps": [
      "Drain and rinse chickpeas; wash cucumber and parsley.",
      "Dice cucumber and chop parsley. Mix with the chickpeas.",
      "Add olive oil and lemon juice gradually, tossing to coat without soaking the salad.",
      "Refrigerate until serving and transport cold if taking it to another gathering."
    ],
    "referenceIds": []
  },
  "grilled-corn": {
    "ingredientIds": [
      "corn",
      "olive-oil"
    ],
    "equipment": [
      "Grill",
      "Tongs"
    ],
    "phase": "COOK",
    "task": "Grill corn while the mains cook, turning it regularly.",
    "steps": [
      "Remove husks and silks and wash the corn.",
      "Brush lightly with the listed olive oil.",
      "Grill over medium heat, turning regularly until the kernels are tender and lightly browned.",
      "Serve hot, using clean tongs and keeping vegetable utensils separate from raw-meat tools."
    ],
    "referenceIds": [
      "vegetables"
    ]
  },
  "brunch-breakfast-potatoes": {
    "ingredientIds": [
      "potatoes",
      "onion",
      "olive-oil"
    ],
    "equipment": [
      "Baking tray",
      "Oven"
    ],
    "phase": "START",
    "task": "Roast the breakfast potatoes before quick brunch dishes.",
    "steps": [
      "Heat the oven to 200°C / 400°F. Wash and dice potatoes; peel and cut onion into similar-size pieces.",
      "Toss with olive oil and spread on a tray with space between pieces.",
      "Roast until potatoes are tender and browned, turning partway through. Larger quantities need extra trays or batches.",
      "Serve hot; if prepared earlier, refrigerate promptly and reheat thoroughly before serving."
    ],
    "referenceIds": []
  },
  "brunch-spinach-mushrooms": {
    "ingredientIds": [
      "spinach",
      "mushrooms",
      "olive-oil"
    ],
    "equipment": [
      "Skillet"
    ],
    "phase": "FINISH",
    "task": "Cook mushrooms first and wilt spinach just before serving.",
    "steps": [
      "Wash spinach, clean mushrooms and slice them.",
      "Heat olive oil in a skillet and cook mushrooms until tender, letting their moisture evaporate.",
      "Add spinach in batches and cook just until wilted and heated through.",
      "Serve hot with clean utensils; this is a quick finishing dish."
    ],
    "referenceIds": []
  },
  "brunch-citrus-grapes": {
    "ingredientIds": [
      "oranges",
      "grapes"
    ],
    "equipment": [
      "Knife and board",
      "Serving bowl"
    ],
    "phase": "FINISH",
    "task": "Wash grapes and peel oranges close to serving.",
    "steps": [
      "Wash grapes and oranges; use a clean board and utensils.",
      "Peel oranges and cut into bite-size pieces. Remove seeds and halve grapes if appropriate for your guests.",
      "Combine in a clean bowl without adding unlisted dressing.",
      "Keep chilled until serving and set out small batches."
    ],
    "referenceIds": [
      "fruit"
    ]
  },
  "brunch-apple-side": {
    "ingredientIds": [
      "apples",
      "lemon"
    ],
    "equipment": [
      "Knife and board"
    ],
    "phase": "FINISH",
    "task": "Slice apples and add lemon just before serving.",
    "steps": [
      "Wash apples and lemon; use a clean board and utensils.",
      "Core apples and cut into wedges appropriate for your guests.",
      "Toss with a little lemon juice to slow browning; add it gradually rather than using all the shopping amount.",
      "Keep chilled until serving and prepare close to mealtime."
    ],
    "referenceIds": []
  },
  "gathering-fruit-cups": {
    "ingredientIds": [
      "apples",
      "oranges",
      "lemon"
    ],
    "equipment": [
      "Knife and board",
      "Lidded containers",
      "Cooler"
    ],
    "phase": "FINISH",
    "task": "Cut fruit and keep the cups cold until serving.",
    "steps": [
      "Wash apples, oranges and lemon; use a clean board.",
      "Core apples, peel oranges and cut the fruit into bite-size pieces.",
      "Toss apples with a little lemon juice and portion with oranges into clean cups. Prepare close to serving to limit browning.",
      "Refrigerate, then transport in an insulated cooler with ice packs; keep cut fruit cold."
    ],
    "referenceIds": []
  },
  "apple-oat-squares": {
    "ingredientIds": [
      "apples",
      "certified-oats",
      "olive-oil"
    ],
    "equipment": [
      "Grater",
      "Shallow baking dish",
      "Oven"
    ],
    "phase": "START",
    "task": "Bake the apple-oat mixture early and allow it to cool.",
    "steps": [
      "Heat the oven to 180°C / 350°F. Wash and core apples; finely grate them, keeping their juice. Check that the oats are certified gluten-free.",
      "Mix apples and juice with oats and olive oil. Press into a shallow lined baking dish; do not add unlisted flour, egg or butter.",
      "Bake until the oats are cooked and the surface is set, checking the center rather than relying on the catalog time.",
      "Cool before cutting. These three-ingredient pieces can be soft; if they do not hold, portion as baked apple-oat cups instead."
    ],
    "referenceIds": [
      "apple"
    ],
    "notice": "This is an authored three-ingredient preparation, not the linked crisp recipe. Cooling takes additional time."
  },
  "buffet-chickpea-dip": {
    "ingredientIds": [
      "chickpeas",
      "lemon",
      "olive-oil",
      "carrot",
      "cucumber"
    ],
    "equipment": [
      "Blender or masher",
      "Knife and board"
    ],
    "phase": "FINISH",
    "task": "Blend the lemon chickpea dip and cut vegetables.",
    "steps": [
      "Drain and rinse chickpeas; wash carrot, cucumber and lemon.",
      "Blend or thoroughly mash chickpeas with olive oil and a little lemon juice; add water gradually for a spoonable texture.",
      "Cut carrots and cucumber into sticks using clean utensils.",
      "Refrigerate the dip and vegetables until serving. This menu's dip does not include tahini; do not add it from the reference recipe."
    ],
    "referenceIds": [
      "hummus"
    ]
  },
  "buffet-tomato-skewers": {
    "ingredientIds": [
      "tomato",
      "cucumber",
      "fresh-herbs"
    ],
    "equipment": [
      "Skewers",
      "Knife and board"
    ],
    "phase": "FINISH",
    "task": "Assemble the fresh vegetable skewers close to serving.",
    "steps": [
      "Wash tomatoes, cucumber and parsley thoroughly.",
      "Cut tomato and cucumber into sturdy bite-size pieces.",
      "Thread onto clean skewers and scatter chopped parsley over the platter.",
      "Keep chilled until serving and use clean serving utensils."
    ],
    "referenceIds": []
  },
  "bbq-lemon-herb-sauce": {
    "ingredientIds": [
      "lemon",
      "fresh-herbs",
      "olive-oil"
    ],
    "equipment": [
      "Knife and board",
      "Small bowl"
    ],
    "phase": "FINISH",
    "task": "Mix the lemon-parsley sauce separately from raw grill food.",
    "steps": [
      "Wash lemons and parsley; finely chop the parsley.",
      "Mix olive oil with a little lemon juice, adding juice gradually to taste.",
      "Stir in parsley and keep covered and chilled until serving.",
      "Serve with a clean spoon; never reuse it as a raw-meat marinade or baste."
    ],
    "referenceIds": []
  },
  "bbq-tomato-sauce": {
    "ingredientIds": [
      "tomato",
      "garlic",
      "olive-oil"
    ],
    "equipment": [
      "Small saucepan"
    ],
    "phase": "COOK",
    "task": "Simmer the tomato sauce while the grill heats.",
    "steps": [
      "Wash and chop tomatoes; peel and finely mince garlic.",
      "Warm olive oil in a saucepan and gently cook garlic without browning it.",
      "Add tomatoes and simmer until they soften into a sauce, adding a little water if needed to prevent sticking.",
      "Serve separately with a clean spoon, keeping raw-meat brushes and utensils out of the finished sauce."
    ],
    "referenceIds": []
  }
};

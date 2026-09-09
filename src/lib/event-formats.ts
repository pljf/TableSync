import type { DishCategory, EventType } from "@/lib/domain";

export type EventMenuSlot = {
  label: string;
  category: DishCategory;
  min: number;
  max: number;
  requiredTag?: string;
};

export type EventFormat = {
  label: string;
  description: string;
  structure: string;
  coverage: string;
  preparationNotes: string[];
  slots?: EventMenuSlot[];
  requiresPlantBasedMain?: boolean;
};

const sharedCoverage = "Every guest needs a safe, substantial main and at least one safe side. Portions cover the larger of expected and joined guest counts.";

export const eventFormats: Record<EventType, EventFormat> = {
  DINNER: {
    label: "Dinner",
    description: "A shared sit-down meal with mains and sides.",
    structure: "1–2 mains, 2 sides, an optional dessert, and a drink.",
    coverage: sharedCoverage,
    preparationNotes: []
  },
  HOTPOT: {
    label: "Hotpot",
    description: "A shared broth with ingredients cooked at the table.",
    structure: "1 broth, 2 proteins, 2 vegetables, 1 staple, 2 sauces, and a drink.",
    coverage: "The shared broth must be safe for everyone. Every guest needs a safe protein and a safe vegetable or staple.",
    preparationNotes: []
  },
  POTLUCK: {
    label: "Potluck",
    description: "A meal of shareable dishes that guests can volunteer to bring.",
    structure: "2 shareable mains, 2 sides, 1 dessert, and a drink.",
    coverage: sharedCoverage,
    preparationNotes: ["Bring each claimed dish in its planned quantity and mark it ready when prepared.", "Keep contributed food within the agreed ingredients and preparation notes so guest restrictions remain covered."],
    slots: [
      { label: "shareable main", category: "MAIN", min: 2, max: 2, requiredTag: "shareable" },
      { label: "shareable side", category: "SIDE", min: 2, max: 2, requiredTag: "shareable" },
      { label: "shareable dessert", category: "DESSERT", min: 1, max: 1, requiredTag: "shareable" },
      { label: "drink", category: "DRINK", min: 1, max: 1 }
    ]
  },
  BBQ: {
    label: "BBQ",
    description: "Grilled mains with a plant-based option, sides, and a sauce.",
    structure: "2 grilled mains, including at least 1 plant-based main, 2 sides, 1 sauce, and a drink.",
    coverage: sharedCoverage,
    preparationNotes: ["Use separate utensils and cooking areas for plant-based mains and meat.", "Keep the sauce separate so guests can choose suitable accompaniments."],
    requiresPlantBasedMain: true,
    slots: [
      { label: "grilled main", category: "MAIN", min: 2, max: 2, requiredTag: "grilled" },
      { label: "BBQ side", category: "SIDE", min: 2, max: 2 },
      { label: "sauce", category: "SAUCE", min: 1, max: 1 },
      { label: "drink", category: "DRINK", min: 1, max: 1 }
    ]
  },
  PICNIC: {
    label: "Picnic",
    description: "Portable mains, sides, and fruit or dessert for eating outdoors.",
    structure: "1–2 portable mains, 2 portable sides, 1 portable fruit or dessert, and a drink.",
    coverage: sharedCoverage,
    preparationNotes: ["Pack prepared dishes in sealed containers with serving utensils.", "Keep perishable dishes chilled during transport and until serving."],
    slots: [
      { label: "portable main", category: "MAIN", min: 1, max: 2, requiredTag: "portable" },
      { label: "portable side", category: "SIDE", min: 2, max: 2, requiredTag: "portable" },
      { label: "portable fruit or dessert", category: "DESSERT", min: 1, max: 1, requiredTag: "portable" },
      { label: "drink", category: "DRINK", min: 1, max: 1 }
    ]
  },
  BRUNCH: {
    label: "Brunch",
    description: "Breakfast and lunch dishes with a savory side and fresh fruit.",
    structure: "1–2 brunch mains, 1 savory side, 1 fruit side, and a drink.",
    coverage: sharedCoverage,
    preparationNotes: ["Serve the savory dishes together with the fruit side for a complete brunch."],
    slots: [
      { label: "brunch main", category: "MAIN", min: 1, max: 2, requiredTag: "brunch" },
      { label: "savory side", category: "SIDE", min: 1, max: 1, requiredTag: "savory" },
      { label: "fruit side", category: "SIDE", min: 1, max: 1, requiredTag: "fruit" },
      { label: "drink", category: "DRINK", min: 1, max: 1 }
    ]
  },
  OTHER: {
    label: "Other",
    description: "A general gathering served as a shared buffet.",
    structure: "1–2 buffet mains, 1 side, 1 appetizer, and a drink.",
    coverage: sharedCoverage,
    preparationNotes: ["Arrange the mains, side, and appetizer as a shared buffet with separate serving utensils."],
    slots: [
      { label: "buffet main", category: "MAIN", min: 1, max: 2, requiredTag: "buffet" },
      { label: "buffet side", category: "SIDE", min: 1, max: 1, requiredTag: "buffet" },
      { label: "buffet appetizer", category: "APPETIZER", min: 1, max: 1, requiredTag: "buffet" },
      { label: "drink", category: "DRINK", min: 1, max: 1 }
    ]
  }
};

export function eventFormatLabel(eventType: EventType): string {
  return eventFormats[eventType]?.label ?? eventType;
}

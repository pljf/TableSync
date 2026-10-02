export type CookingPhase = "START" | "COOK" | "FINISH";

export type CookingGuide = {
  ingredientIds: readonly string[];
  equipment: readonly string[];
  phase: CookingPhase;
  task: string;
  steps: readonly string[];
  referenceIds: readonly string[];
  notice?: string;
};

export type CookingReference = {
  title: string;
  publisher: string;
  url: string;
  difference: string;
};

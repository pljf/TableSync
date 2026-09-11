export type EventType = "DINNER" | "POTLUCK" | "HOTPOT" | "BBQ" | "PICNIC" | "BRUNCH" | "OTHER";

export type RoomStatus =
  | "DRAFT"
  | "COLLECTING_PREFERENCES"
  | "PLANNING"
  | "VOTING"
  | "FINALIZED"
  | "ARCHIVED";

export type DietType =
  | "OMNIVORE"
  | "VEGETARIAN"
  | "VEGAN"
  | "PESCATARIAN"
  | "HALAL"
  | "KOSHER"
  | "GLUTEN_FREE";

export type SpiceLevel = "NONE" | "MILD" | "MEDIUM" | "HOT";

export type DishCategory = "MAIN" | "SIDE" | "APPETIZER" | "DESSERT" | "DRINK" | "SAUCE";

export type HotpotRole = "BROTH" | "PROTEIN" | "VEGETABLE" | "STAPLE" | "SAUCE" | "DRINK";

export type IngredientCategory =
  | "PRODUCE"
  | "MEAT_SEAFOOD"
  | "DAIRY"
  | "PANTRY"
  | "FROZEN"
  | "DRINKS"
  | "SUPPLIES"
  | "OTHER";

export type PlanStatus = "PROPOSED" | "FINALIZED" | "REJECTED";

export type VoteValue = "LIKE" | "NEUTRAL" | "VETO";

export type ActivityType =
  | "ROOM_CREATED"
  | "GUEST_JOINED"
  | "PREFERENCE_UPDATED"
  | "PLANS_GENERATED"
  | "PLAN_GENERATION_FAILED"
  | "PREFERENCES_REOPENED"
  | "VOTE_CAST"
  | "PLAN_FINALIZED"
  | "FINALIZATION_UNDONE"
  | "SHOPPING_GENERATED"
  | "ITEM_ASSIGNED"
  | "ITEM_CHECKED"
  | "CONTRIBUTION_ASSIGNED"
  | "CONTRIBUTION_READY";

export type User = {
  id: string;
  name: string;
  email: string;
  image?: string;
  isAnonymous?: boolean;
};

export type DinnerRoom = {
  id: string;
  hostId: string;
  title: string;
  description?: string;
  eventType: EventType;
  dateTime?: string;
  location?: string;
  totalBudgetCents?: number;
  expectedGuests?: number;
  status: RoomStatus;
  inviteToken?: string;
  isPublicShareable: boolean;
  generationReport?: NoSolutionReport;
  generationAttemptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Preference = {
  id: string;
  guestId: string;
  dietType: DietType;
  allergies: string[];
  dislikes: string[];
  likes: string[];
  spiceLevel: SpiceLevel;
  maxBudgetCents?: number;
  notes?: string;
};

export type Guest = {
  id: string;
  roomId: string;
  name: string;
  email?: string;
  isHostGuest: boolean;
  canBring: boolean;
  createdAt: string;
  updatedAt: string;
  preference: Preference;
};

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  defaultUnit: string;
  tags: string[];
};

export type DishIngredient = {
  ingredient: Ingredient;
  quantity: number;
  unit: string;
};

export type Dish = {
  id: string;
  name: string;
  description?: string;
  category: DishCategory;
  cuisine: string;
  baseServings: number;
  estimatedCostCents: number;
  prepTimeMinutes: number;
  spiceLevel: SpiceLevel;
  spiceAdjustable: boolean;
  supportedEventTypes: EventType[];
  hotpotRole?: HotpotRole;
  tags: string[];
  ingredients: DishIngredient[];
};

export type PlanWarning = {
  type:
    | "ALLERGY_CONFLICT"
    | "BUDGET_TOO_LOW"
    | "DIET_CONFLICT"
    | "LOW_VARIETY"
    | "SPICE_CONFLICT"
    | "SPICE_ADJUSTMENT";
  message: string;
  affectedGuestNames: string[];
};

export type MenuPlanDish = {
  /** Database row ID; generated drafts do not yet have one. */
  id?: string;
  dish: Dish;
  servings: number;
  contributionGuestId?: string;
  contributionReady?: boolean;
};

export type Vote = {
  id: string;
  planId: string;
  guestId: string;
  value: VoteValue;
  reason?: string;
  createdAt: string;
  updatedAt: string;
};

export type MenuPlan = {
  id: string;
  roomId: string;
  title: string;
  summary: string;
  score: number;
  estimatedCostCents: number;
  status: PlanStatus;
  warnings: PlanWarning[];
  dishes: MenuPlanDish[];
  votes: Vote[];
  createdAt: string;
  updatedAt: string;
};

export type ShoppingItem = {
  id: string;
  roomId: string;
  ingredient: Ingredient;
  quantity: number;
  unit: string;
  estimatedCostCents?: number;
  assignedToGuestId?: string;
  checked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  roomId: string;
  actorName: string;
  type: ActivityType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type RoomBundle = {
  room: DinnerRoom;
  guests: Guest[];
  plans: MenuPlan[];
  shopping: ShoppingItem[];
  activities: ActivityEvent[];
};

export type GenerateMenuInput = {
  room: DinnerRoom;
  guests: Guest[];
  dishes: Dish[];
};

export type InviteRoomView = Pick<DinnerRoom, "id" | "title" | "eventType" | "status" | "createdAt">;

export type PublicRoomView = {
  room: Pick<DinnerRoom, "id" | "title" | "eventType" | "dateTime" | "location" | "totalBudgetCents" | "createdAt">;
  finalPlan?: {
    id: string;
    title: string;
    preparationNotes: string[];
    contributionSummary?: { claimedDishes: number; readyDishes: number; totalDishes: number };
    dishes: Array<{
      id: string;
      name: string;
      category: DishCategory;
      hotpotRole?: HotpotRole;
      servings: number;
    }>;
  };
  shoppingCategories: Array<{ category: IngredientCategory; count: number }>;
};

export type GeneratedPlan = Omit<MenuPlan, "id" | "roomId" | "status" | "votes" | "createdAt" | "updatedAt">;

export type NoSolutionIssueCode =
  | "MISSING_REQUIRED_DISH"
  | "UNSAFE_SHARED_BROTH"
  | "GUEST_COVERAGE"
  | "BUDGET_LIMIT"
  | "UNSUPPORTED_EVENT";

export type NoSolutionIssue = {
  code: NoSolutionIssueCode;
  message: string;
  affectedGuestNames: string[];
};

export type ClosestOverBudgetPlan = {
  title: string;
  estimatedCostCents: number;
  budgetCents: number;
  overByCents: number;
  dishNames: string[];
};

export type NoSolutionReport = {
  eventType: EventType;
  summary: string;
  issues: NoSolutionIssue[];
  closestOverBudgetPlan?: ClosestOverBudgetPlan;
};

export type MenuGenerationResult<TPlan = GeneratedPlan> =
  | {
      kind: "success";
      plans: TPlan[];
    }
  | {
      kind: "no-solution";
      report: NoSolutionReport;
    };

export type GenerateShoppingInput = {
  room: DinnerRoom;
  guests: Guest[];
  plan: MenuPlan;
};

export type GeneratedShoppingItem = Omit<ShoppingItem, "id" | "roomId" | "checked" | "createdAt" | "updatedAt">;


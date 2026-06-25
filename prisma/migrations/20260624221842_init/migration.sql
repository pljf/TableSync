-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DINNER', 'POTLUCK', 'HOTPOT', 'BBQ', 'PICNIC', 'BRUNCH', 'OTHER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('DRAFT', 'COLLECTING_PREFERENCES', 'PLANNING', 'VOTING', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DietType" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'HALAL', 'KOSHER', 'GLUTEN_FREE');

-- CreateEnum
CREATE TYPE "SpiceLevel" AS ENUM ('NONE', 'MILD', 'MEDIUM', 'HOT');

-- CreateEnum
CREATE TYPE "DishCategory" AS ENUM ('MAIN', 'SIDE', 'APPETIZER', 'DESSERT', 'DRINK', 'SAUCE');

-- CreateEnum
CREATE TYPE "IngredientCategory" AS ENUM ('PRODUCE', 'MEAT_SEAFOOD', 'DAIRY', 'PANTRY', 'FROZEN', 'DRINKS', 'SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('PROPOSED', 'FINALIZED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('LIKE', 'NEUTRAL', 'VETO');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ROOM_CREATED', 'GUEST_JOINED', 'PREFERENCE_UPDATED', 'PLANS_GENERATED', 'VOTE_CAST', 'PLAN_FINALIZED', 'SHOPPING_GENERATED', 'ITEM_ASSIGNED', 'ITEM_CHECKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinnerRoom" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "EventType" NOT NULL,
    "dateTime" TIMESTAMP(3),
    "location" TEXT,
    "totalBudgetCents" INTEGER,
    "expectedGuests" INTEGER,
    "status" "RoomStatus" NOT NULL DEFAULT 'DRAFT',
    "inviteToken" TEXT NOT NULL,
    "inviteExpiresAt" TIMESTAMP(3),
    "isPublicShareable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DinnerRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "editToken" TEXT NOT NULL,
    "isHostGuest" BOOLEAN NOT NULL DEFAULT false,
    "canBring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "dietType" "DietType" NOT NULL DEFAULT 'OMNIVORE',
    "allergies" TEXT[],
    "dislikes" TEXT[],
    "likes" TEXT[],
    "spiceLevel" "SpiceLevel" NOT NULL DEFAULT 'MEDIUM',
    "maxBudgetCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "DishCategory" NOT NULL,
    "cuisine" TEXT NOT NULL,
    "baseServings" INTEGER NOT NULL DEFAULT 4,
    "estimatedCostCents" INTEGER NOT NULL,
    "prepTimeMinutes" INTEGER NOT NULL,
    "spiceLevel" "SpiceLevel" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IngredientCategory" NOT NULL,
    "defaultUnit" TEXT NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishIngredient" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "DishIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuPlan" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "score" INTEGER NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'PROPOSED',
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuPlanDish" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "servings" INTEGER NOT NULL,

    CONSTRAINT "MenuPlanDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "value" "VoteValue" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "estimatedCostCents" INTEGER,
    "assignedToGuestId" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DinnerRoom_inviteToken_key" ON "DinnerRoom"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_editToken_key" ON "Guest"("editToken");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_guestId_key" ON "Preference"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DishIngredient_dishId_ingredientId_unit_key" ON "DishIngredient"("dishId", "ingredientId", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "MenuPlanDish_planId_dishId_key" ON "MenuPlanDish"("planId", "dishId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_planId_guestId_key" ON "Vote"("planId", "guestId");

-- AddForeignKey
ALTER TABLE "DinnerRoom" ADD CONSTRAINT "DinnerRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DinnerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuPlan" ADD CONSTRAINT "MenuPlan_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DinnerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuPlanDish" ADD CONSTRAINT "MenuPlanDish_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MenuPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuPlanDish" ADD CONSTRAINT "MenuPlanDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MenuPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DinnerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_assignedToGuestId_fkey" FOREIGN KEY ("assignedToGuestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DinnerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

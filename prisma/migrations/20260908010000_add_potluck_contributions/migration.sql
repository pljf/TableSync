ALTER TABLE "MenuPlanDish"
ADD COLUMN "contributionGuestId" TEXT,
ADD COLUMN "contributionReady" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "MenuPlanDish_contributionGuestId_idx" ON "MenuPlanDish"("contributionGuestId");

ALTER TABLE "MenuPlanDish" ADD CONSTRAINT "MenuPlanDish_contributionGuestId_fkey"
FOREIGN KEY ("contributionGuestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "ActivityType" ADD VALUE 'CONTRIBUTION_ASSIGNED';
ALTER TYPE "ActivityType" ADD VALUE 'CONTRIBUTION_READY';

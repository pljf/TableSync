-- Persist rejected generation outcomes separately from accepted menu plans.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'PLAN_GENERATION_FAILED';

ALTER TABLE "DinnerRoom"
ADD COLUMN "generationReport" JSONB,
ADD COLUMN "generationAttemptedAt" TIMESTAMP(3);

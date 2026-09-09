ALTER TABLE "Guest" ADD COLUMN "submissionKey" TEXT;

CREATE UNIQUE INDEX "Guest_submissionKey_key" ON "Guest"("submissionKey");

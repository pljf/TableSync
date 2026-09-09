CREATE TYPE "AuditActorType" AS ENUM ('ANONYMOUS', 'HOST', 'GUEST', 'SYSTEM');
CREATE TYPE "AuditOutcome" AS ENUM ('ALLOWED', 'DENIED', 'ERROR');

CREATE TABLE "SecurityAuditEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorIdHash" TEXT,
    "action" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "resourceType" TEXT,
    "resourceIdHash" TEXT,
    "ipHash" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityAuditEvent_requestId_idx" ON "SecurityAuditEvent"("requestId");
CREATE INDEX "SecurityAuditEvent_action_outcome_occurredAt_idx" ON "SecurityAuditEvent"("action", "outcome", "occurredAt");
CREATE INDEX "SecurityAuditEvent_occurredAt_idx" ON "SecurityAuditEvent"("occurredAt");

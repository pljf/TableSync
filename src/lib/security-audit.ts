import { createHmac, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { AuditActorType, AuditOutcome, Prisma } from "@/generated/prisma/client";
import { authEnvironment } from "@/lib/auth-environment";
import { prisma } from "@/lib/prisma";

export type SecurityAuditInput = {
  action: string;
  actorType?: AuditActorType;
  actorId?: string;
  outcome: AuditOutcome;
  resourceType?: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonObject;
};

function hashIdentifier(value: string): string {
  return createHmac("sha256", authEnvironment.secret).update(value).digest("base64url");
}

function safeRequestId(candidate: string | null): string {
  return candidate && /^[a-zA-Z0-9_.:-]{1,100}$/.test(candidate) ? candidate : randomUUID();
}

export async function recordSecurityAudit(
  input: SecurityAuditInput,
  requestContext?: { requestId?: string; ipAddress?: string }
): Promise<string> {
  const requestHeaders = requestContext ? undefined : await headers();
  const requestId = safeRequestId(requestContext?.requestId ?? requestHeaders?.get("x-request-id") ?? null);
  const forwarded = requestHeaders?.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = requestContext?.ipAddress || forwarded || requestHeaders?.get("x-real-ip")?.trim();
  try {
    await prisma.securityAuditEvent.create({
      data: {
        requestId,
        actorType: input.actorType ?? "ANONYMOUS",
        actorIdHash: input.actorId ? hashIdentifier(input.actorId) : undefined,
        action: input.action,
        outcome: input.outcome,
        resourceType: input.resourceType,
        resourceIdHash: input.resourceId ? hashIdentifier(input.resourceId) : undefined,
        ipHash: address ? hashIdentifier(address) : undefined,
        metadata: input.metadata
      }
    });
  } catch {
    console.error("Security audit persistence failed.", { requestId, action: input.action });
  }
  return requestId;
}

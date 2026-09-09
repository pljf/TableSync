import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordSecurityAudit } from "@/lib/security-audit";

const requestIds: string[] = [];

afterEach(async () => {
  await prisma.securityAuditEvent.deleteMany({ where: { requestId: { in: requestIds.splice(0) } } });
});

describe("security audit persistence", () => {
  it("stores correlation and outcomes while hashing actor, resource, and network identifiers", async () => {
    const requestId = `audit-test-${crypto.randomUUID()}`;
    requestIds.push(requestId);
    await recordSecurityAudit(
      {
        action: "test-denial",
        actorType: "GUEST",
        actorId: "guest-secret-id",
        outcome: "DENIED",
        resourceType: "room",
        resourceId: "room-secret-id"
      },
      { requestId, ipAddress: "203.0.113.10" }
    );

    const event = await prisma.securityAuditEvent.findFirstOrThrow({ where: { requestId } });
    expect(event).toMatchObject({
      requestId,
      action: "test-denial",
      actorType: "GUEST",
      outcome: "DENIED",
      resourceType: "room"
    });
    expect(event.actorIdHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(event.resourceIdHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(event.ipHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(event)).not.toContain("guest-secret-id");
    expect(JSON.stringify(event)).not.toContain("room-secret-id");
    expect(JSON.stringify(event)).not.toContain("203.0.113.10");
  });
});

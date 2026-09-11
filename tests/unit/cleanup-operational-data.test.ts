import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  roomDeleteMany: vi.fn(),
  otherDeleteMany: vi.fn(),
  transaction: vi.fn(),
  disconnect: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dinnerRoom: { deleteMany: database.roomDeleteMany },
    securityAuditEvent: { deleteMany: database.otherDeleteMany },
    rateLimit: { deleteMany: database.otherDeleteMany },
    session: { deleteMany: database.otherDeleteMany },
    guestSession: { deleteMany: database.otherDeleteMany },
    verification: { deleteMany: database.otherDeleteMany },
    $transaction: database.transaction,
    $disconnect: database.disconnect
  }
}));

describe("operational cleanup room retention", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T05:00:00.000Z"));
    for (const key of ["SECURITY_AUDIT_RETENTION_DAYS", "REVOKED_SESSION_RETENTION_DAYS", "RATE_LIMIT_RETENTION_HOURS"]) {
      vi.stubEnv(key, undefined);
    }
    database.roomDeleteMany.mockResolvedValue({ count: 2 });
    database.otherDeleteMany.mockResolvedValue({ count: 0 });
    database.transaction.mockImplementation((operations: Promise<{ count: number }>[]) => Promise.all(operations));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("purges rooms at the same seven-day boundary and emits counts alongside other maintenance", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await import("../../scripts/cleanup-operational-data");

    expect(database.roomDeleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { createdAt: { lte: new Date("2026-09-04T05:00:00.000Z") } }
    });
    expect(database.transaction).toHaveBeenCalledOnce();
    expect(database.transaction.mock.calls[0][0]).toHaveLength(6);
    expect(JSON.parse(consoleLog.mock.calls[0][0])).toEqual({
      completedAt: "2026-09-11T05:00:00.000Z",
      retention: {
        roomRetentionDays: 7,
        auditRetentionDays: 90,
        rateLimitRetentionHours: 24,
        revokedSessionRetentionDays: 30
      },
      deleted: { rooms: 2, auditEvents: 0, guestSessions: 0, hostSessions: 0, rateLimits: 0, verifications: 0 }
    });
    expect(database.disconnect).toHaveBeenCalledOnce();
  });
});

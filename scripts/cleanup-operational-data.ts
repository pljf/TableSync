import { prisma } from "../src/lib/prisma";
import { expiredRoomCutoff, ROOM_RETENTION_DAYS } from "../src/lib/room-retention";

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Retention setting must be an integer from ${min} through ${max}.`);
  }
  return parsed;
}

const auditRetentionDays = boundedInteger(process.env.SECURITY_AUDIT_RETENTION_DAYS, 90, 30, 365);
const revokedSessionRetentionDays = boundedInteger(process.env.REVOKED_SESSION_RETENTION_DAYS, 30, 7, 90);
const rateLimitRetentionHours = boundedInteger(process.env.RATE_LIMIT_RETENTION_HOURS, 24, 1, 168);
const now = new Date();
const auditCutoff = new Date(now.getTime() - auditRetentionDays * 86_400_000);
const revokedCutoff = new Date(now.getTime() - revokedSessionRetentionDays * 86_400_000);
const rateLimitCutoff = BigInt(now.getTime() - rateLimitRetentionHours * 3_600_000);

const [rooms, auditEvents, rateLimits, hostSessions, guestSessions, verifications] = await prisma.$transaction([
  prisma.dinnerRoom.deleteMany({ where: { createdAt: { lte: expiredRoomCutoff(now) } } }),
  prisma.securityAuditEvent.deleteMany({ where: { occurredAt: { lt: auditCutoff } } }),
  prisma.rateLimit.deleteMany({ where: { lastRequest: { lt: rateLimitCutoff } } }),
  prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
  prisma.guestSession.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: revokedCutoff } }]
    }
  }),
  prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } })
]);

console.log(
  JSON.stringify({
    completedAt: now.toISOString(),
    retention: {
      roomRetentionDays: ROOM_RETENTION_DAYS,
      auditRetentionDays,
      rateLimitRetentionHours,
      revokedSessionRetentionDays
    },
    deleted: {
      rooms: rooms.count,
      auditEvents: auditEvents.count,
      guestSessions: guestSessions.count,
      hostSessions: hostSessions.count,
      rateLimits: rateLimits.count,
      verifications: verifications.count
    }
  })
);

await prisma.$disconnect();

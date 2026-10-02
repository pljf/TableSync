import type { Prisma } from "@/generated/prisma/client";

export const ROOM_RETENTION_DAYS = 7;
export const ROOM_EVENT_GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const ROOM_RETENTION_MS = ROOM_RETENTION_DAYS * DAY_MS;
const ROOM_EVENT_GRACE_MS = ROOM_EVENT_GRACE_DAYS * DAY_MS;

export function roomExpiresAt(createdAt: string | Date, dateTime?: string | Date | null): Date {
  const minimumExpiry = new Date(createdAt).getTime() + ROOM_RETENTION_MS;
  const eventExpiry = dateTime ? new Date(dateTime).getTime() + ROOM_EVENT_GRACE_MS : minimumExpiry;
  return new Date(Math.max(minimumExpiry, eventExpiry));
}

export function expiredRoomCutoff(now = new Date()): Date {
  return new Date(now.getTime() - ROOM_RETENTION_MS);
}

export function activeRoomWhere(now = new Date()) {
  // Keep OR nested so spreading this filter cannot replace an authorization OR.
  return { AND: [{ OR: [
    { createdAt: { gt: expiredRoomCutoff(now) } },
    { dateTime: { gt: new Date(now.getTime() - ROOM_EVENT_GRACE_MS) } }
  ] }] } satisfies Prisma.DinnerRoomWhereInput;
}

export function expiredRoomWhere(now = new Date()) {
  return { AND: [
    { createdAt: { lte: expiredRoomCutoff(now) } },
    { OR: [
      { dateTime: null },
      { dateTime: { lte: new Date(now.getTime() - ROOM_EVENT_GRACE_MS) } }
    ] }
  ] } satisfies Prisma.DinnerRoomWhereInput;
}

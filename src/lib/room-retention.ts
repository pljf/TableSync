export const ROOM_RETENTION_DAYS = 7;
const ROOM_RETENTION_MS = ROOM_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function roomExpiresAt(createdAt: string | Date): Date {
  return new Date(new Date(createdAt).getTime() + ROOM_RETENTION_MS);
}

export function expiredRoomCutoff(now = new Date()): Date {
  return new Date(now.getTime() - ROOM_RETENTION_MS);
}

export function activeRoomWhere(now = new Date()) {
  return { createdAt: { gt: expiredRoomCutoff(now) } };
}

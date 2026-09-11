import { createHash, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { authEnvironment } from "@/lib/auth-environment";
import { AuthorizationError, type GuestActor } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { activeRoomWhere } from "@/lib/room-retention";

export const GUEST_SESSION_COOKIE = "tablesync_guest_session";
export const GUEST_SESSION_SECONDS = 60 * 60 * 24 * 30;
const ROOM_COOKIE_PREFIX = `${GUEST_SESSION_COOKIE}_room_`;

export function guestRoomCookieName(roomId: string): string {
  return `${ROOM_COOKIE_PREFIX}${createHash("sha256").update(roomId).digest("hex").slice(0, 24)}`;
}

function isGuestCookie(name: string): boolean {
  return name === GUEST_SESSION_COOKIE || /^tablesync_guest_session_room_[a-f0-9]{24}$/.test(name);
}

export function deriveGuestSessionToken(guestId: string, submissionKey: string): string {
  return createHmac("sha256", authEnvironment.secret)
    .update(`tablesync-guest-session\0${guestId}\0${submissionKey}`)
    .digest("base64url");
}

export function hashGuestSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const cookieOptions = () => ({
    httpOnly: true,
    secure: authEnvironment.secureCookies,
    sameSite: "lax" as const,
    path: "/",
    maxAge: GUEST_SESSION_SECONDS
});

export async function setGuestSessionCookie(token: string, roomId: string): Promise<void> {
  const cookieStore = await cookies();
  const previous = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  const replaced = cookieStore.get(guestRoomCookieName(roomId))?.value;
  const previousSession = previous && previous !== token ? await prisma.guestSession.findUnique({
    where: { tokenHash: hashGuestSessionToken(previous) },
    include: { guest: { select: { roomId: true } } }
  }) : null;
  // Preserve a pre-upgrade browser's response before replacing its legacy cookie.
  if (previous && previousSession) {
    if (!previousSession.revokedAt && previousSession.expiresAt > new Date() && previousSession.guest.roomId !== roomId) {
      const previousName = guestRoomCookieName(previousSession.guest.roomId);
      if (!cookieStore.get(previousName)) cookieStore.set(previousName, previous, cookieOptions());
    }
  }
  const replacedSession = replaced && replaced !== token
    ? replaced === previous ? previousSession : await prisma.guestSession.findUnique({
        where: { tokenHash: hashGuestSessionToken(replaced) }, include: { guest: { select: { roomId: true } } }
      })
    : null;
  const replacedHashes = [...new Set([
    previousSession?.guest.roomId === roomId ? previousSession.tokenHash : undefined,
    replacedSession?.guest.roomId === roomId ? replacedSession.tokenHash : undefined
  ].filter((hash): hash is string => Boolean(hash)))];
  // Same-room replacement is explicit in the join form. Retire the old identity
  // so replaying its earlier form cannot reactivate it after sign-out.
  if (replacedHashes.length) await prisma.guestSession.updateMany({
    where: { tokenHash: { in: replacedHashes }, revokedAt: null }, data: { revokedAt: new Date() }
  });
  cookieStore.set(guestRoomCookieName(roomId), token, cookieOptions());
  // Keep old bookmarks and clients working; scoped URLs never depend on this choice.
  cookieStore.set(GUEST_SESSION_COOKIE, token, cookieOptions());
}

export async function getCurrentGuestActor(roomId?: string): Promise<GuestActor | null> {
  const cookieStore = await cookies();
  const tokens = [...new Set([
    roomId ? cookieStore.get(guestRoomCookieName(roomId))?.value : undefined,
    cookieStore.get(GUEST_SESSION_COOKIE)?.value,
    ...(!roomId ? cookieStore.getAll().filter(({ name }) => isGuestCookie(name)).map(({ value }) => value) : [])
  ].filter((token): token is string => Boolean(token)))];
  for (const token of tokens) {
    const session = await prisma.guestSession.findUnique({
      where: { tokenHash: hashGuestSessionToken(token), guest: { room: activeRoomWhere() } },
      include: { guest: { select: { id: true, roomId: true, name: true } } }
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) continue;
    if (roomId && session.guest.roomId !== roomId) continue;
    return { kind: "guest", guestId: session.guest.id, roomId: session.guest.roomId, name: session.guest.name };
  }
  return null;
}

export async function requireGuestActor(roomId?: string): Promise<GuestActor> {
  const actor = await getCurrentGuestActor(roomId);
  if (!actor) {
    throw new AuthorizationError();
  }
  return actor;
}

export async function getSavedGuestRooms(): Promise<Array<{ roomId: string; roomTitle: string; guestName: string }>> {
  const cookieStore = await cookies();
  const guestCookies = cookieStore.getAll().filter(({ name, value }) => isGuestCookie(name) && value);
  if (guestCookies.length === 0) return [];
  const sessions = await prisma.guestSession.findMany({
    where: { tokenHash: { in: [...new Set(guestCookies.map(({ value }) => hashGuestSessionToken(value)))] }, revokedAt: null, expiresAt: { gt: new Date() }, guest: { room: activeRoomWhere() } },
    include: { guest: { select: { roomId: true, name: true, room: { select: { title: true } } } } }
  });
  const rooms = new Map<string, { roomId: string; roomTitle: string; guestName: string }>();
  for (const session of sessions) {
    const scoped = cookieStore.get(guestRoomCookieName(session.guest.roomId))?.value;
    const scopedSession = scoped ? sessions.find((item) => item.tokenHash === hashGuestSessionToken(scoped) && item.guest.roomId === session.guest.roomId) : undefined;
    const selected = scopedSession ? scoped : cookieStore.get(GUEST_SESSION_COOKIE)?.value;
    if (!selected || hashGuestSessionToken(selected) !== session.tokenHash) continue;
    rooms.set(session.guest.roomId, { roomId: session.guest.roomId, roomTitle: session.guest.room.title, guestName: session.guest.name });
  }
  return [...rooms.values()];
}

/** Sign-out ends every participant identity retained by this browser. */
export async function revokeCurrentGuestSession(): Promise<string[]> {
  const cookieStore = await cookies();
  const guestCookies = cookieStore.getAll().filter(({ name }) => isGuestCookie(name));
  const tokens = [...new Set(guestCookies.map(({ value }) => value).filter(Boolean))];
  if (tokens.length) {
    await prisma.guestSession.updateMany({
      where: { tokenHash: { in: tokens.map(hashGuestSessionToken) }, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
  return [...new Set([GUEST_SESSION_COOKIE, ...guestCookies.map(({ name }) => name)])];
}

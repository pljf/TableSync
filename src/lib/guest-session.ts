import { createHash, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { authEnvironment } from "@/lib/auth-environment";
import { AuthorizationError, type GuestActor } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const GUEST_SESSION_COOKIE = "tablesync_guest_session";
export const GUEST_SESSION_SECONDS = 60 * 60 * 24 * 30;

export function deriveGuestSessionToken(guestId: string, submissionKey: string): string {
  return createHmac("sha256", authEnvironment.secret)
    .update(`tablesync-guest-session\0${guestId}\0${submissionKey}`)
    .digest("base64url");
}

export function hashGuestSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function setGuestSessionCookie(token: string): Promise<void> {
  (await cookies()).set(GUEST_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: authEnvironment.secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_SESSION_SECONDS
  });
}

export async function getCurrentGuestActor(): Promise<GuestActor | null> {
  const token = (await cookies()).get(GUEST_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const session = await prisma.guestSession.findUnique({
    where: { tokenHash: hashGuestSessionToken(token) },
    include: { guest: { select: { id: true, roomId: true, name: true } } }
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }
  return { kind: "guest", guestId: session.guest.id, roomId: session.guest.roomId, name: session.guest.name };
}

export async function requireGuestActor(): Promise<GuestActor> {
  const actor = await getCurrentGuestActor();
  if (!actor) {
    throw new AuthorizationError();
  }
  return actor;
}

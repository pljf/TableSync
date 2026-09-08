import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ values: new Map<string, string>(), findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => state.values.has(name) ? { name, value: state.values.get(name)! } : undefined,
  getAll: () => [...state.values].map(([name, value]) => ({ name, value })),
  set: state.set
}) }));
vi.mock("@/lib/auth-environment", () => ({ authEnvironment: { secret: "unit-test-secret", secureCookies: true } }));
vi.mock("@/lib/prisma", () => ({ prisma: { guestSession: { findUnique: state.findUnique, findMany: state.findMany, updateMany: state.updateMany } } }));

import { GUEST_SESSION_COOKIE, getCurrentGuestActor, getSavedGuestRooms, guestRoomCookieName, hashGuestSessionToken, requireGuestActor, revokeCurrentGuestSession, setGuestSessionCookie } from "@/lib/guest-session";

const session = (roomId: string, token: string, overrides = {}) => ({
  tokenHash: hashGuestSessionToken(token), revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
  guest: { id: `guest-${roomId}`, roomId, name: `Guest ${roomId}`, room: { title: `Meal ${roomId}` } }, ...overrides
});

describe("room-scoped meal responses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.values.clear();
    state.set.mockImplementation((name: string, value: string) => state.values.set(name, value));
    state.findUnique.mockResolvedValue(null);
    state.updateMany.mockResolvedValue({ count: 1 });
  });

  it("retains a legacy response when joining a second room with secure independent cookies", async () => {
    state.values.set(GUEST_SESSION_COOKIE, "old-response");
    state.findUnique.mockResolvedValue(session("room-a", "old-response"));
    await setGuestSessionCookie("new-response", "room-b");
    expect(state.values.get(guestRoomCookieName("room-a"))).toBe("old-response");
    expect(state.values.get(guestRoomCookieName("room-b"))).toBe("new-response");
    expect(state.values.get(GUEST_SESSION_COOKIE)).toBe("new-response");
    for (const call of state.set.mock.calls) expect(call[2]).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });

  it("selects the requested room identity even when another room was joined last", async () => {
    state.values.set(guestRoomCookieName("room-a"), "token-a");
    state.values.set(guestRoomCookieName("room-b"), "token-b");
    state.values.set(GUEST_SESSION_COOKIE, "token-b");
    state.findUnique.mockImplementation(async ({ where }) => [session("room-a", "token-a"), session("room-b", "token-b")].find((item) => item.tokenHash === where.tokenHash));
    expect(await requireGuestActor("room-a")).toMatchObject({ guestId: "guest-room-a", roomId: "room-a" });
    expect(await requireGuestActor("room-b")).toMatchObject({ guestId: "guest-room-b", roomId: "room-b" });
  });

  it("retires a replaced same-room response while keeping identities in other rooms", async () => {
    state.values.set(guestRoomCookieName("room-a"), "old-a");
    state.values.set(guestRoomCookieName("room-b"), "keep-b");
    state.values.set(GUEST_SESSION_COOKIE, "keep-b");
    state.findUnique.mockImplementation(async ({ where }) => [session("room-a", "old-a"), session("room-b", "keep-b")].find((item) => item.tokenHash === where.tokenHash));
    await setGuestSessionCookie("new-a", "room-a");
    expect(state.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { tokenHash: { in: [hashGuestSessionToken("old-a")] }, revokedAt: null }, data: { revokedAt: expect.any(Date) }
    });
    expect(state.values.get(guestRoomCookieName("room-b"))).toBe("keep-b");
    expect(state.values.get(guestRoomCookieName("room-a"))).toBe("new-a");
  });

  it("keeps a same-room replacement retryable if revocation cannot persist", async () => {
    state.values.set(GUEST_SESSION_COOKIE, "old-a");
    state.findUnique.mockResolvedValue(session("room-a", "old-a"));
    state.updateMany.mockRejectedValue(new Error("Database unavailable"));
    await expect(setGuestSessionCookie("new-a", "room-a")).rejects.toThrow("Database unavailable");
    expect(state.values.get(GUEST_SESSION_COOKIE)).toBe("old-a");
    expect(state.set).not.toHaveBeenCalled();
  });

  it("supports legacy links and cookies without accepting a different room's token", async () => {
    state.values.set(GUEST_SESSION_COOKIE, "legacy");
    state.findUnique.mockResolvedValue(session("room-a", "legacy"));
    expect(await getCurrentGuestActor("room-a")).toMatchObject({ roomId: "room-a" });
    expect(await getCurrentGuestActor()).toMatchObject({ roomId: "room-a" });
    state.values.set(guestRoomCookieName("room-b"), "legacy");
    expect(await getCurrentGuestActor("room-b")).toBeNull();
    await expect(requireGuestActor("room-b")).rejects.toThrow("You do not have access");
  });

  it.each(["revoked", "expired"])("rejects a %s saved response without changing browser cookies", async (kind) => {
    state.values.set(guestRoomCookieName("room-a"), "ended");
    state.findUnique.mockResolvedValue(session("room-a", "ended", kind === "revoked" ? { revokedAt: new Date() } : { expiresAt: new Date(0) }));
    expect(await getCurrentGuestActor("room-a")).toBeNull();
    expect(state.set).not.toHaveBeenCalled();
  });

  it("lists only verified selected identities for switching rooms", async () => {
    state.values.set(guestRoomCookieName("room-a"), "token-a");
    state.values.set(guestRoomCookieName("room-b"), "token-b");
    state.values.set(GUEST_SESSION_COOKIE, "token-b");
    state.findMany.mockResolvedValue([session("room-a", "token-a"), session("room-b", "token-b")]);
    expect(await getSavedGuestRooms()).toEqual([
      { roomId: "room-a", roomTitle: "Meal room-a", guestName: "Guest room-a" },
      { roomId: "room-b", roomTitle: "Meal room-b", guestName: "Guest room-b" }
    ]);
    expect(state.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revokedAt: null, expiresAt: { gt: expect.any(Date) } }) }));
  });

  it("revokes every browser response once and returns all expiration names", async () => {
    state.values.set(guestRoomCookieName("room-a"), "token-a");
    state.values.set(guestRoomCookieName("room-b"), "token-b");
    state.values.set(GUEST_SESSION_COOKIE, "token-b");
    state.values.set("unrelated", "keep");
    const names = await revokeCurrentGuestSession();
    expect(new Set(names)).toEqual(new Set([GUEST_SESSION_COOKIE, guestRoomCookieName("room-a"), guestRoomCookieName("room-b")]));
    expect(state.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { tokenHash: { in: [hashGuestSessionToken("token-a"), hashGuestSessionToken("token-b")] }, revokedAt: null }, data: { revokedAt: expect.any(Date) }
    });
    expect(state.set).not.toHaveBeenCalled();
  });
});

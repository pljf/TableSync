import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  dinnerRoom: { findUnique: vi.fn(), update: vi.fn() },
  guest: { findUnique: vi.fn(), create: vi.fn() },
  guestSession: { findUnique: vi.fn(), create: vi.fn() },
  activityEvent: { create: vi.fn() }
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx) } }));
vi.mock("@/lib/auth-environment", () => ({ authEnvironment: { secret: "unit-only-guest-session-replay-secret" } }));

import { deriveGuestSessionToken, hashGuestSessionToken } from "@/lib/guest-session";
import { joinRoom } from "@/lib/store";

const input = {
  token: "invite-1", submissionKey: "submission-1", name: "Guest One", canBring: true,
  preference: { dietType: "VEGETARIAN" as const, allergies: [], dislikes: [], likes: [], spiceLevel: "MILD" as const }
};
const guestId = "guest-1";
const sessionToken = deriveGuestSessionToken(guestId, input.submissionKey);
const session = () => ({
  tokenHash: hashGuestSessionToken(sessionToken), revokedAt: null, expiresAt: new Date(Date.now() + 60_000)
});

describe("guest join replay", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    tx.dinnerRoom.findUnique.mockResolvedValue({ id: "room-1", status: "COLLECTING_PREFERENCES", inviteExpiresAt: null });
    tx.guest.findUnique.mockResolvedValue({
      id: guestId, roomId: "room-1", name: input.name, canBring: true, email: null,
      isHostGuest: false, createdAt: new Date(), updatedAt: new Date(),
      preference: { ...input.preference, id: "preference-1", guestId, notes: null, maxBudgetCents: null }
    });
    tx.guestSession.findUnique.mockResolvedValue(session());
  });

  it("recovers a lost join response after voting begins without extending or replacing the session", async () => {
    tx.dinnerRoom.findUnique.mockResolvedValue({ id: "room-1", status: "VOTING", inviteExpiresAt: null });
    const existingSession = session();
    tx.guestSession.findUnique.mockResolvedValue(existingSession);
    const joined = await joinRoom(input);
    expect(joined).toMatchObject({ id: guestId, roomId: "room-1", sessionToken });
    expect(tx.guestSession.create).not.toHaveBeenCalled();
    expect(tx.guest.create).not.toHaveBeenCalled();
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
    expect(tx.dinnerRoom.update).not.toHaveBeenCalled();
  });

  it.each(["revoked", "expired", "missing", "different-token"])(
    "cannot reactivate an existing %s session by replaying a join",
    async (state) => {
      const endedSession = state === "missing" ? null : {
        ...session(),
        ...(state === "revoked" ? { revokedAt: new Date() } : {}),
        ...(state === "expired" ? { expiresAt: new Date(Date.now() - 1_000) } : {}),
        ...(state === "different-token" ? { tokenHash: "different-token-hash" } : {})
      };
      tx.guestSession.findUnique.mockResolvedValue(endedSession);
      await expect(joinRoom(input)).rejects.toThrow("This response session has ended");
      expect(tx.guestSession.create).not.toHaveBeenCalled();
      expect(tx.guest.create).not.toHaveBeenCalled();
      expect(tx.activityEvent.create).not.toHaveBeenCalled();
      expect(tx.dinnerRoom.update).not.toHaveBeenCalled();
    }
  );

  it("continues to reject fresh submissions after voting begins", async () => {
    tx.dinnerRoom.findUnique.mockResolvedValue({ id: "room-1", status: "VOTING", inviteExpiresAt: null });
    tx.guest.findUnique.mockResolvedValue(null);
    await expect(joinRoom(input)).rejects.toThrow("Cannot join the room while the room is voting");
    expect(tx.guest.create).not.toHaveBeenCalled();
    expect(tx.guestSession.create).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ room: vi.fn(), guest: vi.fn(), actors: vi.fn(), cast: vi.fn(), claim: vi.fn(), toggle: vi.fn(), preferences: vi.fn(), join: vi.fn(), cookie: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/guest-session", () => ({ requireGuestActor: mocks.guest, setGuestSessionCookie: mocks.cookie }));
vi.mock("@/lib/request-actors", () => ({ requireHostActor: vi.fn(), getRequestActors: mocks.actors }));
vi.mock("@/lib/request-context", () => ({ resourceRoomId: mocks.room }));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn(), actorRateLimitSubject: () => "guest:test", requestNetworkSubject: async () => "test-network", RateLimitError: class extends Error {} }));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAudit: vi.fn() }));
vi.mock("@/lib/store", () => ({ castVote: mocks.cast, claimShoppingItem: mocks.claim, toggleShoppingItem: mocks.toggle, updateGuestPreferences: mocks.preferences, joinRoom: mocks.join,
  createRoom: vi.fn(), updateRoomDetails: vi.fn(), finalizePlan: vi.fn(), generatePlansForRoom: vi.fn(), reopenPreferences: vi.fn(), undoFinalization: vi.fn(), assignPotluckContribution: vi.fn(), setPotluckContributionReady: vi.fn() }));
import { castVoteAction, claimShoppingAction, joinRoomAction, toggleShoppingAction, updateGuestPreferencesAction } from "@/app/actions";

const guest = { kind: "guest", guestId: "guest-a", roomId: "room-a", name: "Maya" };
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
const preferences = { name: "Maya", dietType: "VEGETARIAN", spiceLevel: "MILD", roomId: "room-a" };

describe("selecting the room identity for each action", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.room.mockResolvedValue("room-a"); mocks.guest.mockResolvedValue(guest); mocks.actors.mockResolvedValue({ guest }); });
  it("votes as the saved identity for the plan's real room instead of a submitted room", async () => {
    expect(await castVoteAction({ status: "idle" }, form({ planId: "plan-a", value: "LIKE", roomId: "forged-room" }))).toMatchObject({ status: "success" });
    expect(mocks.room).toHaveBeenCalledWith("plan", "plan-a");
    expect(mocks.guest).toHaveBeenCalledWith("room-a");
    expect(mocks.cast).toHaveBeenCalledWith("plan-a", guest, "LIKE", undefined);
  });
  it("uses the grocery item's real room for both assignment and purchase changes", async () => {
    await claimShoppingAction({ status: "idle" }, form({ itemId: "item-a", roomId: "forged-room" }));
    await toggleShoppingAction({ status: "idle" }, form({ itemId: "item-a", checked: "on", roomId: "forged-room" }));
    expect(mocks.room).toHaveBeenCalledWith("shopping-item", "item-a");
    expect(mocks.actors).toHaveBeenNthCalledWith(1, "room-a");
    expect(mocks.actors).toHaveBeenNthCalledWith(2, "room-a");
    expect(mocks.toggle).toHaveBeenCalledWith("item-a", { guest }, true);
  });
  it("keeps preference edits scoped to the form's verified room response", async () => {
    await updateGuestPreferencesAction({ status: "idle" }, form(preferences));
    expect(mocks.guest).toHaveBeenCalledWith("room-a");
    expect(mocks.preferences).toHaveBeenCalledWith(guest, expect.objectContaining({ name: "Maya" }));
  });

  it("rejects an old unscoped form instead of editing whichever room was joined last", async () => {
    const data = form(preferences);
    data.delete("roomId");
    expect(await updateGuestPreferencesAction({ status: "idle" }, data)).toMatchObject({ status: "error", message: expect.stringContaining("Refresh your preferences page") });
    expect(mocks.guest).not.toHaveBeenCalled();
    expect(mocks.preferences).not.toHaveBeenCalled();
  });
  it("persists the new response under its room and returns to a scoped preferences URL", async () => {
    mocks.join.mockResolvedValue({ id: "guest-a", roomId: "room-a", sessionToken: "unit-response-token" });
    const result = await joinRoomAction("c0000000-0000-4000-8000-000000000001", "c0000000-0000-4000-8000-000000000002", { status: "idle" }, form(preferences));
    expect(result).toMatchObject({ status: "success", redirectTo: "/preferences?roomId=room-a&saved=1" });
    expect(mocks.cookie).toHaveBeenCalledWith("unit-response-token", "room-a");
  });
});

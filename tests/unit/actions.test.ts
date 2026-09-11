import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  host: vi.fn(), guest: vi.fn(), createRoom: vi.fn(), updateRoomDetails: vi.fn(), generatePlansForRoom: vi.fn(),
  updateGuestPreferences: vi.fn(), finalizePlan: vi.fn(), audit: vi.fn(), revalidatePath: vi.fn(), setGuestSessionCookie: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/guest-session", () => ({ requireGuestActor: mocks.guest, setGuestSessionCookie: mocks.setGuestSessionCookie }));
vi.mock("@/lib/request-actors", () => ({ requireHostActor: mocks.host, getRequestActors: vi.fn() }));
vi.mock("@/lib/request-context", () => ({ resourceRoomId: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(), actorRateLimitSubject: vi.fn(), requestNetworkSubject: vi.fn(), RateLimitError: class extends Error {}
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAudit: mocks.audit }));
vi.mock("@/lib/store", () => ({
  createRoomWithHostPreferences: mocks.createRoom, updateRoomDetails: mocks.updateRoomDetails, generatePlansForRoom: mocks.generatePlansForRoom,
  castVote: vi.fn(), claimShoppingItem: vi.fn(), finalizePlan: mocks.finalizePlan, joinRoom: vi.fn(), reopenPreferences: vi.fn(),
  toggleShoppingItem: vi.fn(), undoFinalization: vi.fn(), updateGuestPreferences: mocks.updateGuestPreferences
}));

import { redirect } from "next/navigation";
import {
  createRoomAction, generatePlansAction, updateRoomDetailsAction
} from "@/app/actions";

function roomForm() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "Friday dinner", eventType: "DINNER", expectedGuests: "6", totalBudgetDollars: "120.25",
    dateTime: "2026-09-11T19:30", timeZoneOffset: "240", name: "Room Creator", dietType: "VEGETARIAN",
    spiceLevel: "MILD", allergies: "peanut, shellfish", maxBudgetDollars: "25.50"
  })) data.set(key, value);
  return data;
}

describe("room action recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.host.mockResolvedValue({ kind: "host", userId: "host-1" });
    mocks.guest.mockResolvedValue({ kind: "guest", guestId: "guest-1", roomId: "room-1" });
    mocks.createRoom.mockResolvedValue({ room: { id: "room-1" }, sessionToken: "creator-session" });
    mocks.updateRoomDetails.mockResolvedValue({ id: "room-1" });
    mocks.updateGuestPreferences.mockResolvedValue({ id: "guest-1", roomId: "room-1" });
    mocks.finalizePlan.mockResolvedValue("room-1");
    mocks.generatePlansForRoom.mockResolvedValue({ kind: "success", plans: [] });
  });

  it("converts the entered event time and money before saving", async () => {
    const result = await createRoomAction({ status: "idle" }, roomForm());
    expect(result).toMatchObject({ status: "success", redirectTo: "/rooms/room-1" });
    expect(mocks.createRoom).toHaveBeenCalledWith(expect.objectContaining({ userId: "host-1" }), expect.objectContaining({
      dateTime: "2026-09-11T23:30:00.000Z", totalBudgetCents: 12025
    }), expect.objectContaining({
      name: "Room Creator",
      preference: expect.objectContaining({ dietType: "VEGETARIAN", allergies: ["peanut", "shellfish"], maxBudgetCents: 2550 })
    }));
    expect(mocks.setGuestSessionCookie).toHaveBeenCalledWith("creator-session", "room-1");
    expect(result).not.toHaveProperty("sessionToken");
  });

  it.each(["name", "dietType", "spiceLevel"])("requires the creator's %s before creating any room", async (field) => {
    const data = roomForm();
    data.delete(field);
    expect(await createRoomAction({ status: "idle" }, data)).toMatchObject({ status: "error" });
    expect(mocks.createRoom).not.toHaveBeenCalled();
    expect(mocks.setGuestSessionCookie).not.toHaveBeenCalled();
  });

  it("does not issue a participant cookie when room creation fails", async () => {
    mocks.createRoom.mockRejectedValueOnce(new Error("Database unavailable"));
    expect(await createRoomAction({ status: "idle" }, roomForm())).toMatchObject({ status: "error" });
    expect(mocks.setGuestSessionCookie).not.toHaveBeenCalled();
  });

  it("returns recoverable validation feedback without creating a room", async () => {
    const data = roomForm();
    data.set("dateTime", "2026-02-30T19:30");
    expect(await createRoomAction({ status: "idle" }, data)).toMatchObject({ status: "error", message: "Enter a valid date and time" });
    expect(mocks.createRoom).not.toHaveBeenCalled();
  });

  it("saves edits through the same validation and returns to the room", async () => {
    const data = roomForm();
    data.set("totalBudgetDollars", "200");
    expect(await updateRoomDetailsAction("room-1", { status: "idle" }, data)).toMatchObject({
      status: "success", redirectTo: "/rooms/room-1"
    });
    expect(mocks.updateRoomDetails).toHaveBeenCalledWith("room-1", expect.anything(), expect.objectContaining({ totalBudgetCents: 20000 }));
  });

  it("does not announce voting-ready menus for a no-solution result", async () => {
    mocks.generatePlansForRoom.mockResolvedValue({ kind: "no-solution", report: {} });
    const result = await generatePlansAction("room-1", { status: "idle" }, new FormData());
    expect(result.status).toBe("success");
    expect(result.message).toContain("No safe menu fits");
    expect(result.message).not.toContain("ready for voting");
  });

  it("preserves framework sign-in redirects when a session expires before mutation", async () => {
    mocks.host.mockImplementation(() => redirect("/auth"));
    await expect(generatePlansAction("room-1", { status: "idle" }, new FormData())).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT")
    });
    expect(mocks.generatePlansForRoom).not.toHaveBeenCalled();
  });
});

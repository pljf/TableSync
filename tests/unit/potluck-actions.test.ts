import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/lib/authorization";

const mocks = vi.hoisted(() => ({
  actors: vi.fn(), assign: vi.fn(), ready: vi.fn(), audit: vi.fn(), revalidatePath: vi.fn(), rateLimit: vi.fn()
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/request-actors", () => ({ requireHostActor: vi.fn(), getRequestActors: mocks.actors }));
vi.mock("@/lib/request-context", () => ({ resourceRoomId: vi.fn().mockResolvedValue("room-1") }));
vi.mock("@/lib/guest-session", () => ({ requireGuestActor: vi.fn(), setGuestSessionCookie: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mocks.rateLimit, actorRateLimitSubject: () => "guest:authenticated", requestNetworkSubject: vi.fn(), RateLimitError: class extends Error {}
}));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAudit: mocks.audit }));
vi.mock("@/lib/store", () => ({
  assignPotluckContribution: mocks.assign, setPotluckContributionReady: mocks.ready,
  castVote: vi.fn(), claimShoppingItem: vi.fn(), createRoom: vi.fn(), finalizePlan: vi.fn(), generatePlansForRoom: vi.fn(),
  joinRoom: vi.fn(), reopenPreferences: vi.fn(), toggleShoppingItem: vi.fn(), undoFinalization: vi.fn(),
  updateGuestPreferences: vi.fn(), updateRoomDetails: vi.fn()
}));

import { assignPotluckContributionAction, setPotluckContributionReadyAction } from "@/app/actions";

const actors = { guest: { kind: "guest", guestId: "authenticated-guest", roomId: "room-1", name: "Signed-in guest" } };
function form(values: Record<string, string> = {}) {
  const result = new FormData();
  result.set("menuPlanDishId", "persisted-dish-row");
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.actors.mockResolvedValue(actors);
  mocks.assign.mockResolvedValue("room-1");
  mocks.ready.mockResolvedValue("room-1");
});

describe("Potluck server action boundaries", () => {
  it("uses the authenticated actor and forwards explicit reset consent separately from a requested owner", async () => {
    const data = form({ guestId: "requested-owner", confirmShoppingReset: "on", roomId: "forged-room", actorId: "forged-actor" });
    expect(await assignPotluckContributionAction({ status: "idle" }, data)).toMatchObject({ status: "success" });
    expect(mocks.assign).toHaveBeenCalledWith("persisted-dish-row", actors, "requested-owner", true);
    expect(mocks.actors).toHaveBeenCalledWith("room-1");
    expect(mocks.rateLimit).toHaveBeenCalledWith(expect.objectContaining({ scope: "assign-potluck-contribution" }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorType: "GUEST", actorId: "authenticated-guest", resourceType: "menu-plan-dish", outcome: "ALLOWED"
    }));
    // MutationForm acknowledges success before refreshing these dynamic pages.
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("never infers reset consent from a truthy string and normalizes an empty owner into release", async () => {
    await assignPotluckContributionAction({ status: "idle" }, form({ guestId: "", confirmShoppingReset: "true" }));
    expect(mocks.assign).toHaveBeenCalledWith("persisted-dish-row", actors, undefined, false);
  });

  it("returns actionable reset guidance and records denied ownership attempts without refresh", async () => {
    mocks.assign.mockRejectedValueOnce(new Error("Confirm that shared shopping will be rebuilt."));
    expect(await assignPotluckContributionAction({ status: "idle" }, form())).toMatchObject({
      status: "error", message: "Confirm that shared shopping will be rebuilt."
    });
    mocks.assign.mockRejectedValueOnce(new AuthorizationError());
    expect(await assignPotluckContributionAction({ status: "idle" }, form())).toMatchObject({
      status: "error", message: "You do not have access to this resource."
    });
    expect(mocks.audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: "DENIED" }));
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects missing or oversized row identifiers before calling the store", async () => {
    for (const menuPlanDishId of ["", "x".repeat(129)]) {
      expect(await assignPotluckContributionAction({ status: "idle" }, form({ menuPlanDishId }))).toMatchObject({ status: "error" });
      expect(await setPotluckContributionReadyAction({ status: "idle" }, form({ menuPlanDishId }))).toMatchObject({ status: "error" });
    }
    expect(mocks.assign).not.toHaveBeenCalled();
    expect(mocks.ready).not.toHaveBeenCalled();
  });

  it("toggles readiness through the authenticated actor without accepting guest or room identity fields", async () => {
    await setPotluckContributionReadyAction({ status: "idle" }, form({ ready: "on", guestId: "forged-owner" }));
    await setPotluckContributionReadyAction({ status: "idle" }, form());
    expect(mocks.ready).toHaveBeenNthCalledWith(1, "persisted-dish-row", actors, true);
    expect(mocks.ready).toHaveBeenNthCalledWith(2, "persisted-dish-row", actors, false);
  });
});

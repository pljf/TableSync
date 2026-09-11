import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestActors } from "@/lib/authorization";

const db = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { dinnerRoom: { findFirst: db.findFirst } } }));

import { getRoomRevision } from "@/lib/room-revision";

const actors: RequestActors = { host: { kind: "host", userId: "host-1", name: "Host", email: "host@example.test" } };
const initialDate = new Date("2026-09-08T10:00:00Z");
const changedDate = new Date("2026-09-08T10:00:01Z");

function metadata() {
  return {
    id: "room-1", updatedAt: initialDate,
    guests: [{ id: "guest-1", updatedAt: initialDate, preference: { id: "pref-1", updatedAt: initialDate } }],
    plans: [{
      id: "plan-1", updatedAt: initialDate,
      votes: [{ id: "vote-1", updatedAt: initialDate }],
      dishes: [{ id: "dish-1", servings: 2, contributionGuestId: null as string | null, contributionReady: false }]
    }],
    shopping: [{ id: "item-1", updatedAt: initialDate }],
    activities: [{ id: "activity-1" }], _count: { activities: 1 }
  };
}

describe("authorized room revision metadata", () => {
  beforeEach(() => { vi.resetAllMocks(); db.findFirst.mockResolvedValue(metadata()); });

  it("does not query rooms for anonymous actors or a guest scoped to another room", async () => {
    expect(await getRoomRevision("room-1", {})).toBeNull();
    expect(await getRoomRevision("room-1", { guest: { kind: "guest", guestId: "guest-2", roomId: "room-2", name: "Other" } })).toBeNull();
    expect(db.findFirst).not.toHaveBeenCalled();
  });

  it("enforces owning host or current room membership in the metadata query", async () => {
    await getRoomRevision("room-1", actors);
    expect(db.findFirst.mock.calls[0][0].where).toEqual({ id: "room-1", OR: [{ hostId: "host-1" }], createdAt: { gt: expect.any(Date) } });
    await getRoomRevision("room-1", { guest: { kind: "guest", guestId: "guest-1", roomId: "room-1", name: "Guest" } });
    expect(db.findFirst.mock.calls[1][0].where).toEqual({ id: "room-1", OR: [{ guests: { some: { id: "guest-1" } } }], createdAt: { gt: expect.any(Date) } });
    db.findFirst.mockResolvedValue(null);
    expect(await getRoomRevision("room-1", actors)).toBeNull();
  });

  it("returns an opaque stable revision without loading room contents", async () => {
    const first = await getRoomRevision("room-1", actors);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(await getRoomRevision("room-1", actors)).toBe(first);
    const selection = JSON.stringify(db.findFirst.mock.calls[0][0].select);
    for (const field of ["name", "email", "notes", "reason", "ingredients", "allergies", "inviteToken"]) expect(selection).not.toContain(`"${field}"`);
  });

  it.each(["preferences", "votes", "shopping", "contribution owner", "contribution readiness", "plan deletion", "guest joining"])(
    "detects %s changes even when the room timestamp and activity do not change",
    async (change) => {
      const original = await getRoomRevision("room-1", actors);
      const next = metadata();
      if (change === "preferences") next.guests[0].preference.updatedAt = changedDate;
      if (change === "votes") next.plans[0].votes[0].updatedAt = changedDate;
      if (change === "shopping") next.shopping[0].updatedAt = changedDate;
      if (change === "contribution owner") next.plans[0].dishes[0].contributionGuestId = "guest-1";
      if (change === "contribution readiness") next.plans[0].dishes[0].contributionReady = true;
      if (change === "plan deletion") next.plans = [];
      if (change === "guest joining") next.guests.push({ ...next.guests[0], id: "guest-2" });
      db.findFirst.mockResolvedValue(next);
      expect(await getRoomRevision("room-1", actors)).not.toBe(original);
    }
  );
});

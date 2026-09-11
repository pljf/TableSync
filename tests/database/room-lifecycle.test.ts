import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthorizationError, type GuestActor, type HostActor } from "@/lib/authorization";
import type { RoomStatus } from "@/lib/domain";
import { getCurrentGuestActor, getSavedGuestRooms, guestRoomCookieName } from "@/lib/guest-session";
import { prisma } from "@/lib/prisma";
import { getRoomRevision } from "@/lib/room-revision";
import { demoHost } from "@/lib/seed-data";
import {
  assignPotluckContribution, castVote, claimShoppingItem, createRoom, createRoomWithHostPreferences,
  deleteRoom, finalizePlan, generatePlansForRoom, getGuestPreferenceContext, getPublicRoom,
  getRoomBundle, getRoomByInviteToken, joinRoom, listRoomsForHost, reopenPreferences,
  setPotluckContributionReady, toggleShoppingItem, undoFinalization, updateGuestPreferences,
  updateRoomDetails
} from "@/lib/store";

const { savedCookies } = vi.hoisted(() => ({ savedCookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => savedCookies.has(name) ? { name, value: savedCookies.get(name)! } : undefined,
    getAll: () => [...savedCookies].map(([name, value]) => ({ name, value }))
  })
}));

const host: HostActor = { kind: "host", userId: demoHost.id, name: demoHost.name, email: demoHost.email };
const otherHost: HostActor = { kind: "host", userId: "lifecycle-other-host", name: "Other host", email: "lifecycle-other@example.com" };
const roomIds: string[] = [];
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const unavailable = /expired|not found|do not have access/i;

const preference = {
  dietType: "OMNIVORE" as const, allergies: ["peanut"], dislikes: [], likes: [], spiceLevel: "MEDIUM" as const,
  notes: "Private meal response"
};

const guestActor = (guest: { id: string; roomId: string; name: string }): GuestActor => ({
  kind: "guest", guestId: guest.id, roomId: guest.roomId, name: guest.name
});

beforeAll(async () => {
  await prisma.user.upsert({ where: { id: host.userId }, update: {}, create: demoHost });
});

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  savedCookies.clear();
  await prisma.dinnerRoom.deleteMany({ where: { id: { in: roomIds.splice(0) } } });
});

async function fixture(finalized = false) {
  const { room, sessionToken } = await createRoomWithHostPreferences(host, {
    title: `Room lifecycle ${crypto.randomUUID()}`, eventType: "POTLUCK", expectedGuests: 2,
    isPublicShareable: true, totalBudgetCents: 50000
  }, { name: "Room creator", canBring: true, preference });
  roomIds.push(room.id);
  const creator = await prisma.guest.findFirstOrThrow({ where: { roomId: room.id, isHostGuest: true } });
  const joinInput = {
    token: room.inviteToken!, submissionKey: crypto.randomUUID(), name: "Invited participant", canBring: true, preference
  };
  const guest = await joinRoom(joinInput);
  savedCookies.set(guestRoomCookieName(room.id), guest.sessionToken);
  if (!finalized) return { room, creator, sessionToken, guest, joinInput, plan: null };

  // A fixed recipe isolates room lifecycle persistence from menu selection.
  const dish = await prisma.dish.findUniqueOrThrow({ where: { id: "steamed-rice" } });
  const plan = await prisma.menuPlan.create({
    data: {
      roomId: room.id, title: "Lifecycle menu", score: 100, estimatedCostCents: dish.estimatedCostCents,
      dishes: { create: { dishId: dish.id, servings: dish.baseServings } }
    }, include: { dishes: true }
  });
  await prisma.dinnerRoom.update({ where: { id: room.id }, data: { status: "VOTING" } });
  await castVote(plan.id, guestActor(guest), "LIKE");
  await finalizePlan(plan.id, host);
  return { room, creator, sessionToken, guest, joinInput, plan };
}

async function expireRoom(roomId: string) {
  const now = new Date();
  await prisma.dinnerRoom.update({
    where: { id: roomId }, data: { createdAt: new Date(now.getTime() - sevenDays), updatedAt: now }
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
}

describe("room deletion and seven-day expiry", () => {
  it("rejects another host and a participant without deleting the room or its responses", async () => {
    const { room, guest } = await fixture();
    await expect(deleteRoom(room.id, otherHost)).rejects.toBeInstanceOf(AuthorizationError);
    // A direct call with a guest identity must also fail at the runtime boundary.
    await expect(deleteRoom(room.id, guestActor(guest) as unknown as HostActor)).rejects.toBeInstanceOf(AuthorizationError);
    expect(await prisma.dinnerRoom.count({ where: { id: room.id } })).toBe(1);
    expect(await prisma.guest.count({ where: { roomId: room.id } })).toBe(2);
    expect(await getRoomBundle(room.id, { host })).not.toBeNull();
  });

  it.each<RoomStatus>(["DRAFT", "COLLECTING_PREFERENCES", "PLANNING", "VOTING", "FINALIZED", "ARCHIVED"])(
    "lets the owning host delete a room in %s", async (status) => {
      const room = await createRoom(host, { title: `Delete ${status}`, eventType: "DINNER", expectedGuests: 2 });
      roomIds.push(room.id);
      await prisma.dinnerRoom.update({ where: { id: room.id }, data: { status } });
      await deleteRoom(room.id, host);
      expect(await prisma.dinnerRoom.findUnique({ where: { id: room.id } })).toBeNull();
    }
  );

  it("cascades every room-owned record and invalidates saved sessions while preserving other rooms and catalog data", async () => {
    const { room, guest, creator, plan } = await fixture(true);
    if (!plan) throw new Error("Expected a finalized fixture.");
    const other = await createRoom(host, { title: "Room to retain", eventType: "DINNER", expectedGuests: 2 });
    roomIds.push(other.id);
    const shopping = await prisma.shoppingItem.findFirstOrThrow({ where: { roomId: room.id } });
    if (shopping.assignedToGuestId !== guest.id) await claimShoppingItem(shopping.id, { host }, guest.id);
    await toggleShoppingItem(shopping.id, { host }, true);
    // Include an assigned potluck child, without regenerating away the shopping fixture.
    await prisma.menuPlanDish.update({
      where: { id: plan.dishes[0].id }, data: { contributionGuestId: guest.id, contributionReady: true }
    });
    const guestIds = [guest.id, creator.id];
    const before = await Promise.all([
      prisma.preference.count({ where: { guestId: { in: guestIds } } }),
      prisma.guestSession.count({ where: { guestId: { in: guestIds } } }),
      prisma.vote.count({ where: { planId: plan.id } }),
      prisma.activityEvent.count({ where: { roomId: room.id } })
    ]);
    expect(before[0]).toBe(2);
    expect(before[1]).toBe(2);
    expect(before[2]).toBe(1);
    expect(before[3]).toBeGreaterThan(0);
    expect(await getCurrentGuestActor(room.id)).toMatchObject({ guestId: guest.id });

    await deleteRoom(room.id, host);

    const remaining = await Promise.all([
      prisma.dinnerRoom.count({ where: { id: room.id } }),
      prisma.guest.count({ where: { id: { in: guestIds } } }),
      prisma.preference.count({ where: { guestId: { in: guestIds } } }),
      prisma.guestSession.count({ where: { guestId: { in: guestIds } } }),
      prisma.menuPlan.count({ where: { roomId: room.id } }),
      prisma.menuPlanDish.count({ where: { planId: plan.id } }),
      prisma.vote.count({ where: { planId: plan.id } }),
      prisma.shoppingItem.count({ where: { roomId: room.id } }),
      prisma.activityEvent.count({ where: { roomId: room.id } })
    ]);
    expect(remaining).toEqual(Array(9).fill(0));
    expect(await prisma.dinnerRoom.findUnique({ where: { id: other.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: host.userId } })).not.toBeNull();
    expect(await prisma.dish.findUnique({ where: { id: plan.dishes[0].dishId } })).not.toBeNull();
    expect(await prisma.ingredient.findUnique({ where: { id: shopping.ingredientId } })).not.toBeNull();
    expect(await getRoomBundle(room.id, { host })).toBeNull();
    expect(await getRoomByInviteToken(room.inviteToken!)).toBeNull();
    expect(await getPublicRoom(room.id)).toBeNull();
    expect(await getRoomRevision(room.id, { guest: guestActor(guest) })).toBeNull();
    expect(await getCurrentGuestActor(room.id)).toBeNull();
    expect(await getSavedGuestRooms()).toEqual([]);
  });

  it("hides a room and its sessions at exactly seven days even when the room was just edited", async () => {
    const { room, guest } = await fixture(true);
    const actor = guestActor(guest);
    const now = new Date();
    const cutoff = now.getTime() - sevenDays;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    await prisma.dinnerRoom.update({
      where: { id: room.id }, data: { createdAt: new Date(cutoff + 1), updatedAt: now }
    });
    expect((await listRoomsForHost(host)).some(({ id }) => id === room.id)).toBe(true);
    expect(await getRoomBundle(room.id, { host })).not.toBeNull();
    expect(await getRoomBundle(room.id, { guest: actor })).not.toBeNull();
    expect(await getRoomByInviteToken(room.inviteToken!)).not.toBeNull();
    expect(await getPublicRoom(room.id)).not.toBeNull();
    expect(await getGuestPreferenceContext(actor)).not.toBeNull();
    expect(await getRoomRevision(room.id, { host })).not.toBeNull();
    expect(await getCurrentGuestActor(room.id)).not.toBeNull();
    expect(await getSavedGuestRooms()).toContainEqual({ roomId: room.id, roomTitle: room.title, guestName: guest.name });

    await prisma.dinnerRoom.update({ where: { id: room.id }, data: { createdAt: new Date(cutoff), updatedAt: now } });
    expect((await listRoomsForHost(host)).some(({ id }) => id === room.id)).toBe(false);
    expect(await getRoomBundle(room.id, { host })).toBeNull();
    expect(await getRoomBundle(room.id, { guest: actor })).toBeNull();
    expect(await getRoomByInviteToken(room.inviteToken!)).toBeNull();
    expect(await getPublicRoom(room.id)).toBeNull();
    expect(await getGuestPreferenceContext(actor)).toBeNull();
    expect(await getRoomRevision(room.id, { host })).toBeNull();
    expect(await getRoomRevision(room.id, { guest: actor })).toBeNull();
    expect(await getCurrentGuestActor(room.id)).toBeNull();
    expect(await getSavedGuestRooms()).toEqual([]);
    // Access ends on time even before the scheduled physical purge runs.
    expect(await prisma.dinnerRoom.count({ where: { id: room.id } })).toBe(1);
  });

  it("rejects joins, join retries, preference edits, room edits, and generation after expiry", async () => {
    const { room, guest, joinInput } = await fixture();
    await expireRoom(room.id);
    const before = await prisma.dinnerRoom.findUniqueOrThrow({
      where: { id: room.id }, include: { guests: { include: { preference: true, sessions: true } }, activities: true }
    });
    await expect(joinRoom({ ...joinInput, submissionKey: crypto.randomUUID() })).rejects.toThrow("Invite link is invalid.");
    await expect(joinRoom(joinInput)).rejects.toThrow("Invite link is invalid.");
    await expect(updateGuestPreferences(guestActor(guest), {
      name: "Changed participant", canBring: false, preference
    })).rejects.toThrow(unavailable);
    await expect(updateRoomDetails(room.id, host, {
      title: "Changed expired room", eventType: "DINNER", expectedGuests: 3
    })).rejects.toThrow(unavailable);
    await expect(generatePlansForRoom(room.id, host)).rejects.toThrow(unavailable);
    expect(await prisma.dinnerRoom.findUniqueOrThrow({
      where: { id: room.id }, include: { guests: { include: { preference: true, sessions: true } }, activities: true }
    })).toEqual(before);
  });

  it("rejects voting and host planning transitions after expiry", async () => {
    const { room, guest, plan } = await fixture(true);
    if (!plan) throw new Error("Expected a finalized fixture.");
    await undoFinalization(room.id, host);
    await expireRoom(room.id);
    const before = await prisma.dinnerRoom.findUniqueOrThrow({
      where: { id: room.id }, include: { plans: { include: { votes: true } }, activities: true }
    });
    await expect(castVote(plan.id, guestActor(guest), "NEUTRAL")).rejects.toThrow(unavailable);
    await expect(finalizePlan(plan.id, host)).rejects.toThrow(unavailable);
    await expect(reopenPreferences(room.id, host)).rejects.toThrow(unavailable);
    await expect(generatePlansForRoom(room.id, host)).rejects.toThrow(unavailable);
    expect(await prisma.dinnerRoom.findUniqueOrThrow({
      where: { id: room.id }, include: { plans: { include: { votes: true } }, activities: true }
    })).toEqual(before);
  });

  it("rejects shopping, potluck contributions, and undo finalization after expiry", async () => {
    const { room, guest, plan } = await fixture(true);
    if (!plan) throw new Error("Expected a finalized fixture.");
    const item = await prisma.shoppingItem.findFirstOrThrow({ where: { roomId: room.id } });
    await prisma.menuPlanDish.update({ where: { id: plan.dishes[0].id }, data: { contributionGuestId: guest.id } });
    await expireRoom(room.id);
    const before = await prisma.dinnerRoom.findUniqueOrThrow({
      where: { id: room.id }, include: { shopping: true, plans: { include: { dishes: true } }, activities: true }
    });
    await expect(claimShoppingItem(item.id, { host }, guest.id)).rejects.toThrow(unavailable);
    await expect(toggleShoppingItem(item.id, { host }, true)).rejects.toThrow(unavailable);
    await expect(assignPotluckContribution(plan.dishes[0].id, { host }, undefined, true)).rejects.toThrow(unavailable);
    await expect(setPotluckContributionReady(plan.dishes[0].id, { guest: guestActor(guest) }, true)).rejects.toThrow(unavailable);
    await expect(undoFinalization(room.id, host)).rejects.toThrow(unavailable);
    expect(await prisma.dinnerRoom.findUniqueOrThrow({
      where: { id: room.id }, include: { shopping: true, plans: { include: { dishes: true } }, activities: true }
    })).toEqual(before);
  });
});

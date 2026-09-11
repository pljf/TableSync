import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GuestActor, HostActor } from "@/lib/authorization";
import { hashGuestSessionToken } from "@/lib/guest-session";
import { prisma } from "@/lib/prisma";
import { demoHost } from "@/lib/seed-data";
import {
  createRoomWithHostPreferences,
  generatePlansForRoom,
  getGuestPreferenceContext,
  getRoomBundle,
  updateGuestPreferences
} from "@/lib/store";

const host: HostActor = {
  kind: "host", userId: demoHost.id, name: demoHost.name, email: demoHost.email
};
type CreatorInput = Parameters<typeof createRoomWithHostPreferences>[2];
const roomIds: string[] = [];
const rollbackTitles: string[] = [];

function creatorInput(): CreatorInput {
  return {
    name: "Room Creator",
    email: "creator-response@example.com",
    canBring: true,
    preference: {
      dietType: "VEGAN",
      allergies: ["soy"],
      likes: ["rice"],
      dislikes: ["mushrooms"],
      spiceLevel: "MILD",
      maxBudgetCents: 10000,
      notes: "Please include a plant-based option."
    }
  };
}

beforeAll(async () => {
  await prisma.user.upsert({ where: { id: demoHost.id }, update: {}, create: demoHost });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.dinnerRoom.deleteMany({
    where: { OR: [{ id: { in: roomIds.splice(0) } }, { title: { in: rollbackTitles.splice(0) } }] }
  });
});

describe("room creator preferences", () => {
  it("saves the creator as a participant with their submitted preferences and an editable hashed session", async () => {
    const creator = creatorInput();
    const { room, sessionToken } = await createRoomWithHostPreferences(host, {
      title: "Creator response persistence", eventType: "POTLUCK", expectedGuests: 4
    }, creator);
    roomIds.push(room.id);

    expect(room).toMatchObject({ hostId: host.userId, status: "COLLECTING_PREFERENCES" });
    const guests = await prisma.guest.findMany({
      where: { roomId: room.id }, include: { preference: true, sessions: true }
    });
    expect(guests).toHaveLength(1);
    const guest = guests[0];
    expect(guest).toMatchObject({
      roomId: room.id, name: creator.name, email: creator.email, canBring: true, isHostGuest: true,
      preference: creator.preference
    });
    expect(guest.sessions).toHaveLength(1);
    const session = guest.sessions[0];
    expect(session.tokenHash === sessionToken).toBe(false);
    expect(session.tokenHash === hashGuestSessionToken(sessionToken)).toBe(true);
    expect(session.revokedAt).toBeNull();
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(guest).includes(sessionToken)).toBe(false);

    const actor: GuestActor = { kind: "guest", guestId: guest.id, roomId: room.id, name: guest.name };
    expect((await getGuestPreferenceContext(actor))?.guest.preference).toMatchObject(creator.preference);
    const updated = {
      ...creator, canBring: false,
      preference: { ...creator.preference, dietType: "VEGETARIAN" as const, allergies: ["sesame"] }
    };
    await updateGuestPreferences(actor, updated);
    const bundle = await getRoomBundle(room.id, { host });
    expect(bundle?.guests).toHaveLength(1);
    expect(bundle?.guests[0]).toMatchObject({
      id: guest.id, isHostGuest: true, canBring: false, preference: updated.preference
    });
    expect(await prisma.guestSession.count({ where: { guestId: guest.id } })).toBe(1);
  });

  it("includes the creator's diet and allergy when generating menu options", async () => {
    const creator = creatorInput();
    // Mild vegan dinner mains use tofu; peanut allergy still excludes a seeded
    // side while leaving a complete menu available for this participant.
    creator.preference.allergies = ["peanut"];
    const { room } = await createRoomWithHostPreferences(host, {
      title: "Creator dietary constraints", eventType: "DINNER", expectedGuests: 2, totalBudgetCents: 20000
    }, creator);
    roomIds.push(room.id);

    const generation = await generatePlansForRoom(room.id, host);
    if (generation.kind !== "success") throw new Error("Expected menus for the creator's vegan, peanut-free response.");
    expect(generation.plans.length).toBeGreaterThan(0);
    const excludedTags = new Set(["meat", "beef", "chicken", "pork", "seafood", "fish", "shellfish", "dairy", "egg", "honey", "peanut"]);
    for (const plan of generation.plans) {
      expect(plan.dishes.some(({ dish }) => dish.category === "MAIN")).toBe(true);
      expect(plan.dishes.some(({ dish }) => dish.category === "SIDE")).toBe(true);
      for (const { dish } of plan.dishes) {
        const tags = [...dish.tags, ...dish.ingredients.flatMap(({ ingredient }) => ingredient.tags)];
        expect(tags.filter((tag) => excludedTags.has(tag)), dish.name).toEqual([]);
      }
    }
  }, 30_000);

  it("leaves no partial room or response after an invalid nested diet", async () => {
    const title = `Creator invalid diet ${crypto.randomUUID()}`;
    rollbackTitles.push(title);
    const creator = creatorInput();
    // Bypass the input type to exercise nested persistence failure, independent
    // of the form's validation. Every possible leftover belongs to this fixture.
    const invalid = {
      ...creator, name: title, preference: { ...creator.preference, dietType: "UNSUPPORTED_DIET" }
    } as unknown as CreatorInput;
    await expect(createRoomWithHostPreferences(host, {
      title, eventType: "DINNER", expectedGuests: 2
    }, invalid)).rejects.toThrow();

    expect(await prisma.dinnerRoom.count({ where: { title } })).toBe(0);
    expect(await prisma.guest.count({ where: { name: title } })).toBe(0);
    expect(await prisma.preference.count({ where: { guest: { name: title } } })).toBe(0);
    expect(await prisma.guestSession.count({ where: { guest: { name: title } } })).toBe(0);
    expect(await prisma.activityEvent.count({ where: { message: `Created ${title}.` } })).toBe(0);
  });

  it("rolls back the new room when a nested creator insert conflicts with an existing participant", async () => {
    const { room: originalRoom } = await createRoomWithHostPreferences(host, {
      title: "Existing creator response", eventType: "DINNER", expectedGuests: 2
    }, creatorInput());
    roomIds.push(originalRoom.id);
    const original = await prisma.guest.findFirstOrThrow({
      where: { roomId: originalRoom.id }, include: { preference: true, sessions: true }
    });
    const title = `Creator duplicate participant ${crypto.randomUUID()}`;
    rollbackTitles.push(title);
    // Fail inside the database's nested write using a duplicate guest primary
    // key. Submission and invitation UUIDs continue to be generated normally.
    const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(original.id as ReturnType<typeof crypto.randomUUID>);
    await expect(createRoomWithHostPreferences(host, {
      title, eventType: "DINNER", expectedGuests: 2
    }, { ...creatorInput(), name: title })).rejects.toMatchObject({ code: "P2002" });
    uuid.mockRestore();
    // Check committed state through a fresh connection after the failed write.
    await prisma.$disconnect();

    expect(await prisma.dinnerRoom.count({ where: { title } })).toBe(0);
    expect(await prisma.guest.count({ where: { name: title } })).toBe(0);
    expect(await prisma.preference.count({ where: { guest: { name: title } } })).toBe(0);
    expect(await prisma.guestSession.count({ where: { guest: { name: title } } })).toBe(0);
    expect(await prisma.activityEvent.count({ where: { message: `Created ${title}.` } })).toBe(0);
    expect(await prisma.dinnerRoom.count({ where: { id: originalRoom.id } })).toBe(1);
    expect(await prisma.guest.findUniqueOrThrow({
      where: { id: original.id }, include: { preference: true, sessions: true }
    })).toEqual(original);
  });
});

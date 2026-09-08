import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GuestActor, HostActor } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { demoHost } from "@/lib/seed-data";
import {
  castVote,
  claimShoppingItem,
  createRoom,
  finalizePlan,
  generatePlansForRoom,
  getGuestPreferenceContext,
  getPublicRoom,
  getRoomBundle,
  joinRoom,
  reopenPreferences,
  toggleShoppingItem,
  undoFinalization,
  updateGuestPreferences,
  updateRoomDetails
} from "@/lib/store";

const host: HostActor = {
  kind: "host",
  userId: demoHost.id,
  name: demoHost.name,
  email: demoHost.email
};
const attackerHost: HostActor = {
  kind: "host",
  userId: "user-attacker",
  name: "Attacker",
  email: "attacker@example.com"
};
const createdRoomIds: string[] = [];

function guestActor(guest: { id: string; roomId: string; name: string }): GuestActor {
  return { kind: "guest", guestId: guest.id, roomId: guest.roomId, name: guest.name };
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: demoHost.id },
    update: {},
    create: demoHost
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (createdRoomIds.length > 0) {
    await prisma.dinnerRoom.deleteMany({ where: { id: { in: createdRoomIds.splice(0) } } });
  }
});

describe("Prisma-backed store", () => {
  it.each(["revoked", "expired"])("cannot reactivate a %s participant session with an old join submission", async (state) => {
    const room = await createRoom(host, { title: "Ended participant session", eventType: "DINNER", expectedGuests: 2 });
    createdRoomIds.push(room.id);
    const input = {
      token: room.inviteToken!, submissionKey: crypto.randomUUID(), name: "Session Guest", canBring: false,
      preference: { dietType: "OMNIVORE" as const, allergies: [], dislikes: [], likes: [], spiceLevel: "MILD" as const }
    };
    const guest = await joinRoom(input);
    const endedAt = new Date(Date.now() - 1_000);
    const ended = await prisma.guestSession.update({
      where: { guestId: guest.id },
      data: state === "revoked" ? { revokedAt: endedAt } : { expiresAt: endedAt }
    });
    await expect(joinRoom(input)).rejects.toThrow("This response session has ended");
    const persisted = await prisma.guestSession.findUniqueOrThrow({ where: { guestId: guest.id } });
    expect(persisted).toMatchObject({ tokenHash: ended.tokenHash, revokedAt: ended.revokedAt, expiresAt: ended.expiresAt });
    expect(await prisma.guest.count({ where: { roomId: room.id } })).toBe(1);
    expect(await prisma.activityEvent.count({ where: { roomId: room.id, type: "GUEST_JOINED" } })).toBe(1);
  });

  it("recovers an active join response after voting starts without extending the original session", async () => {
    const room = await createRoom(host, { title: "Recover joining guest", eventType: "DINNER", expectedGuests: 2 });
    createdRoomIds.push(room.id);
    const input = {
      token: room.inviteToken!, submissionKey: crypto.randomUUID(), name: "Retry Guest", canBring: false,
      preference: { dietType: "OMNIVORE" as const, allergies: [], dislikes: [], likes: [], spiceLevel: "MILD" as const }
    };
    const guest = await joinRoom(input);
    const original = await prisma.guestSession.findUniqueOrThrow({ where: { guestId: guest.id } });
    await prisma.dinnerRoom.update({ where: { id: room.id }, data: { status: "VOTING" } });
    const retried = await joinRoom(input);
    expect(retried).toMatchObject({ id: guest.id, sessionToken: guest.sessionToken });
    expect(await prisma.guestSession.findUniqueOrThrow({ where: { guestId: guest.id } })).toEqual(original);
    expect(await prisma.guest.count({ where: { roomId: room.id } })).toBe(1);
    await expect(joinRoom({ ...input, submissionKey: crypto.randomUUID() })).rejects.toThrow("Cannot join the room while the room is voting");
  });

  it("persists rooms and a tokenless, hashed guest session idempotently", async () => {
    const room = await createRoom(host, {
      title: "Database integration test",
      eventType: "DINNER",
      expectedGuests: 4
    });
    createdRoomIds.push(room.id);

    const joinInput = {
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Integration Guest",
      canBring: true,
      preference: {
        dietType: "VEGETARIAN" as const,
        allergies: ["peanut"],
        dislikes: [],
        likes: ["mushrooms"],
        spiceLevel: "MILD" as const
      }
    };
    const joined = await Promise.all(Array.from({ length: 5 }, () => joinRoom(joinInput)));
    const guest = joined[0];
    if (!guest) throw new Error("Expected an idempotent guest result.");
    const actor = guestActor(guest);
    expect(new Set(joined.map((item) => item.id))).toEqual(new Set([guest.id]));
    expect(new Set(joined.map((item) => item.sessionToken))).toEqual(new Set([guest.sessionToken]));

    const storedSessions = await prisma.guestSession.findMany({ where: { guestId: guest.id } });
    expect(storedSessions).toHaveLength(1);
    expect(storedSessions[0]?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedSessions[0]?.tokenHash).not.toBe(guest.sessionToken);

    const updateInput = {
      name: guest.name,
      email: guest.email,
      canBring: guest.canBring,
      preference: {
        ...guest.preference,
        likes: [...guest.preference.likes, "tofu"],
        notes: "Updated once"
      }
    };
    await updateGuestPreferences(actor, updateInput);
    await updateGuestPreferences(actor, updateInput);

    const bundle = await getRoomBundle(room.id, { host });
    const persistedRoom = await prisma.dinnerRoom.findUnique({
      where: { id: room.id },
      include: { guests: { include: { preference: true } }, activities: true }
    });

    expect(bundle?.guests.map((item) => item.id)).toEqual([guest.id]);
    expect((await getGuestPreferenceContext(actor))?.guest.preference.likes).toContain("tofu");
    expect(persistedRoom?.guests[0]?.preference?.dietType).toBe("VEGETARIAN");
    expect(persistedRoom?.activities.map((event) => event.type)).toEqual(
      expect.arrayContaining(["ROOM_CREATED", "GUEST_JOINED"])
    );
    expect(persistedRoom?.activities.filter((event) => event.type === "GUEST_JOINED")).toHaveLength(1);
    expect(persistedRoom?.activities.filter((event) => event.type === "PREFERENCE_UPDATED")).toHaveLength(1);
  });

  it("enforces host and guest identity across planning, voting, finalization, and shopping", async () => {
    const room = await createRoom(host, {
      title: "Workflow integration test",
      eventType: "DINNER",
      expectedGuests: 4,
      totalBudgetCents: 12000
    });
    createdRoomIds.push(room.id);
    const guest = await joinRoom({
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Workflow Guest",
      canBring: true,
      preference: {
        dietType: "OMNIVORE",
        allergies: [],
        dislikes: [],
        likes: ["rice"],
        spiceLevel: "MEDIUM"
      }
    });
    const actor = guestActor(guest);

    await expect(generatePlansForRoom(room.id, attackerHost)).rejects.toThrow("You do not have access");
    const generation = await generatePlansForRoom(room.id, host);
    expect(generation.kind).toBe("success");
    if (generation.kind !== "success") return;
    const plan = generation.plans[0];
    if (!plan) throw new Error("Expected a generated plan.");

    await expect(castVote(plan.id, actor, "VETO")).rejects.toThrow("A veto reason is required.");
    const concurrentVotes = await Promise.allSettled(
      Array.from({ length: 5 }, () => castVote(plan.id, actor, "LIKE", "Only vetoes should retain a reason."))
    );
    expect(concurrentVotes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrentVotes.filter((result) => result.status === "rejected")).toHaveLength(4);
    await expect(castVote(plan.id, actor, "LIKE")).rejects.toThrow("This vote is unchanged.");
    await expect(
      joinRoom({
        token: room.inviteToken!,
        submissionKey: crypto.randomUUID(),
        name: "Late Guest",
        canBring: false,
        preference: {
          dietType: "OMNIVORE",
          allergies: [],
          dislikes: [],
          likes: [],
          spiceLevel: "MEDIUM"
        }
      })
    ).rejects.toThrow("Cannot join the room while the room is voting.");
    await expect(
      updateGuestPreferences(actor, {
        name: guest.name,
        email: guest.email,
        canBring: guest.canBring,
        preference: guest.preference
      })
    ).rejects.toThrow("Cannot update preferences while the room is voting.");
    await expect(finalizePlan(plan.id, attackerHost)).rejects.toThrow("You do not have access");
    expect((await getRoomBundle(room.id, { host }))?.room.status).toBe("VOTING");
    const concurrentFinalizations = await Promise.allSettled(
      Array.from({ length: 4 }, () => finalizePlan(plan.id, host))
    );
    expect(concurrentFinalizations.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrentFinalizations.filter((result) => result.status === "rejected")).toHaveLength(3);
    await expect(castVote(plan.id, actor, "NEUTRAL")).rejects.toThrow("Cannot vote while the room is finalized.");
    await expect(generatePlansForRoom(room.id, host)).rejects.toThrow(
      "Cannot generate menu plans while the room is finalized."
    );

    const finalized = await getRoomBundle(room.id, { host });
    const firstItem = finalized?.shopping[0];
    if (!firstItem) throw new Error("Expected a generated shopping item.");
    await claimShoppingItem(firstItem.id, { host }, undefined);
    const concurrentClaims = await Promise.allSettled(
      Array.from({ length: 4 }, () => claimShoppingItem(firstItem.id, { host }, guest.id))
    );
    expect(concurrentClaims.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(claimShoppingItem(firstItem.id, { host }, guest.id)).rejects.toThrow(
      "This shopping assignment is unchanged."
    );
    const concurrentToggles = await Promise.allSettled(
      Array.from({ length: 4 }, () => toggleShoppingItem(firstItem.id, { host }, true))
    );
    expect(concurrentToggles.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(toggleShoppingItem(firstItem.id, { host }, true)).rejects.toThrow(
      "This purchased state is unchanged."
    );

    const updated = await getRoomBundle(room.id, { host });
    expect(updated?.room.status).toBe("FINALIZED");
    expect(updated?.plans.find((item) => item.id === plan.id)?.votes[0]).toMatchObject({
      reason: undefined,
      value: "LIKE"
    });
    expect(updated?.shopping.find((item) => item.id === firstItem.id)).toMatchObject({
      assignedToGuestId: guest.id,
      checked: true
    });
    expect(updated?.activities.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "PLANS_GENERATED",
        "VOTE_CAST",
        "PLAN_FINALIZED",
        "SHOPPING_GENERATED",
        "ITEM_ASSIGNED",
        "ITEM_CHECKED"
      ])
    );
    expect(updated?.activities.filter((event) => event.type === "VOTE_CAST")).toHaveLength(1);
    expect(updated?.activities.filter((event) => event.type === "PLAN_FINALIZED")).toHaveLength(1);
    expect(updated?.activities.filter((event) => event.type === "SHOPPING_GENERATED")).toHaveLength(1);
    expect(updated?.activities.filter((event) => event.type === "ITEM_ASSIGNED")).toHaveLength(2);
    expect(updated?.activities.filter((event) => event.type === "ITEM_CHECKED")).toHaveLength(1);

    await expect(undoFinalization(room.id, attackerHost)).rejects.toThrow("You do not have access");
    await undoFinalization(room.id, host);
    const reopenedVoting = await getRoomBundle(room.id, { host });
    expect(reopenedVoting?.room.status).toBe("VOTING");
    expect(reopenedVoting?.shopping).toHaveLength(0);
    expect(reopenedVoting?.plans.find((item) => item.id === plan.id)).toMatchObject({
      status: "PROPOSED",
      votes: [expect.objectContaining({ value: "LIKE" })]
    });

    await expect(reopenPreferences(room.id, attackerHost)).rejects.toThrow("You do not have access");
    await reopenPreferences(room.id, host);
    const collecting = await getRoomBundle(room.id, { host });
    expect(collecting?.room.status).toBe("COLLECTING_PREFERENCES");
    expect(collecting?.plans).toHaveLength(0);
    expect(collecting?.shopping).toHaveLength(0);
  }, 30_000);

  it("clears optional guest fields and removes a previous veto reason when a vote changes", async () => {
    const room = await createRoom(host, {
      title: "Clearing saved fields",
      eventType: "DINNER",
      expectedGuests: 2
    });
    createdRoomIds.push(room.id);
    const guest = await joinRoom({
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Editing Guest",
      email: "remove-me@example.com",
      canBring: true,
      preference: {
        dietType: "OMNIVORE",
        allergies: [],
        dislikes: [],
        likes: [],
        spiceLevel: "MEDIUM",
        maxBudgetCents: 10000,
        notes: "Remove this note"
      }
    });
    const actor = guestActor(guest);
    const clearedInput = {
      name: guest.name,
      canBring: guest.canBring,
      preference: { ...guest.preference, maxBudgetCents: undefined, notes: undefined }
    };
    await updateGuestPreferences(actor, clearedInput);
    await updateGuestPreferences(actor, clearedInput);
    const persisted = await prisma.guest.findUniqueOrThrow({
      where: { id: guest.id },
      include: { preference: true }
    });
    expect(persisted.email).toBeNull();
    expect(persisted.preference).toMatchObject({ maxBudgetCents: null, notes: null });
    expect(await prisma.activityEvent.count({ where: { roomId: room.id, type: "PREFERENCE_UPDATED" } })).toBe(1);

    const generation = await generatePlansForRoom(room.id, host);
    if (generation.kind !== "success" || !generation.plans[0]) throw new Error("Expected a generated plan.");
    const planId = generation.plans[0].id;
    for (const value of ["LIKE", "NEUTRAL"] as const) {
      await castVote(planId, actor, "VETO", "A concern that was resolved");
      await castVote(planId, actor, value);
      expect(await prisma.vote.findUniqueOrThrow({
        where: { planId_guestId: { planId, guestId: guest.id } }
      })).toMatchObject({ value, reason: null });
      await expect(castVote(planId, actor, value)).rejects.toThrow("This vote is unchanged.");
    }
  }, 30_000);

  it.each([
    { initialBudget: undefined, updatedBudget: 1, expectedKind: "no-solution" },
    { initialBudget: 1, updatedBudget: undefined, expectedKind: "success" }
  ] as const)("uses room budget changes committed during catalog loading: $expectedKind", async ({ initialBudget, updatedBudget, expectedKind }) => {
    const room = await createRoom(host, {
      title: "Generation snapshot regression",
      eventType: "DINNER",
      expectedGuests: 2,
      totalBudgetCents: initialBudget
    });
    createdRoomIds.push(room.id);
    await joinRoom({
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Budget Editor",
      canBring: false,
      preference: {
        dietType: "OMNIVORE",
        allergies: [],
        dislikes: [],
        likes: [],
        spiceLevel: "MEDIUM"
      }
    });
    const readCatalog = prisma.dish.findMany.bind(prisma.dish);
    // This barrier reproduces a room update committed after generation starts,
    // before it obtains the room lock and publishes plans or a no-solution report.
    const delayedCatalog = async (args: Parameters<typeof readCatalog>[0]) => {
      const dishes = await readCatalog(args);
      await updateRoomDetails(room.id, host, {
        title: room.title,
        eventType: room.eventType,
        expectedGuests: 2,
        totalBudgetCents: updatedBudget
      });
      return dishes;
    };
    vi.spyOn(prisma.dish, "findMany").mockImplementationOnce(delayedCatalog as typeof readCatalog);
    expect((await generatePlansForRoom(room.id, host)).kind).toBe(expectedKind);
    const bundle = await getRoomBundle(room.id, { host });
    expect(bundle?.room.status).toBe(expectedKind === "success" ? "VOTING" : "PLANNING");
    expect(bundle?.room.totalBudgetCents).toBe(updatedBudget);
  });

  it("allows only one guest to claim an unassigned item and prevents taking another guest's assignment", async () => {
    const room = await createRoom(host, {
      title: "Shopping claim ownership",
      eventType: "DINNER",
      expectedGuests: 2
    });
    createdRoomIds.push(room.id);
    const guests = await Promise.all(["First Guest", "Second Guest"].map((name) => joinRoom({
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name,
      canBring: false,
      preference: {
        dietType: "OMNIVORE",
        allergies: [],
        dislikes: [],
        likes: [],
        spiceLevel: "MEDIUM"
      }
    })));
    const generation = await generatePlansForRoom(room.id, host);
    if (generation.kind !== "success" || !generation.plans[0]) throw new Error("Expected a generated plan.");
    await finalizePlan(generation.plans[0].id, host);
    const item = (await getRoomBundle(room.id, { host }))?.shopping[0];
    if (!item) throw new Error("Expected a shopping item.");
    expect(item.assignedToGuestId).toBeUndefined();
    const attempts = await Promise.allSettled(guests.map((guest) =>
      claimShoppingItem(item.id, { guest: guestActor(guest) }, guest.id)
    ));
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    const assigned = await prisma.shoppingItem.findUniqueOrThrow({ where: { id: item.id } });
    const owner = guests.find((guest) => guest.id === assigned.assignedToGuestId)!;
    const other = guests.find((guest) => guest.id !== owner.id)!;
    await expect(claimShoppingItem(item.id, { guest: guestActor(other) }, other.id)).rejects.toThrow("You do not have access");
    await expect(claimShoppingItem(item.id, { guest: guestActor(other) })).rejects.toThrow("You do not have access");
    await expect(toggleShoppingItem(item.id, { guest: guestActor(other) }, true)).rejects.toThrow("You do not have access");
    await claimShoppingItem(item.id, { host }, other.id);
    await claimShoppingItem(item.id, { guest: guestActor(other) });
    expect((await prisma.shoppingItem.findUniqueOrThrow({ where: { id: item.id } })).assignedToGuestId).toBeNull();
  }, 30_000);

  it("denies cross-room IDOR and exposes only the explicit public DTO", async () => {
    const room = await createRoom(host, {
      title: "Private boundary test",
      eventType: "DINNER",
      expectedGuests: 2,
      totalBudgetCents: 10000,
      isPublicShareable: true
    });
    const otherRoom = await createRoom(host, {
      title: "Other private room",
      eventType: "DINNER",
      expectedGuests: 2
    });
    createdRoomIds.push(room.id, otherRoom.id);
    const guest = await joinRoom({
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Room One Guest",
      email: "private@example.com",
      canBring: true,
      preference: {
        dietType: "OMNIVORE",
        allergies: ["private-allergy"],
        dislikes: [],
        likes: ["rice"],
        spiceLevel: "MEDIUM",
        notes: "Private note intended only for the host"
      }
    });
    const otherGuest = await joinRoom({
      token: otherRoom.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Other Guest",
      canBring: false,
      preference: {
        dietType: "OMNIVORE",
        allergies: [],
        dislikes: [],
        likes: [],
        spiceLevel: "MILD"
      }
    });
    const otherActor = guestActor(otherGuest);

    expect(await getRoomBundle(room.id, {})).toBeNull();
    expect(await getRoomBundle(room.id, { host: attackerHost })).toBeNull();
    expect(await getRoomBundle(room.id, { guest: otherActor })).toBeNull();
    const guestView = await getRoomBundle(room.id, { guest: guestActor(guest) });
    expect(guestView?.guests[0]?.email).toBeUndefined();
    expect(guestView?.guests[0]?.preference.notes).toBeUndefined();
    expect((await getRoomBundle(room.id, { host }))?.guests[0]?.preference.notes).toBe(guest.preference.notes);
    expect((await getGuestPreferenceContext(guestActor(guest)))?.guest.preference.notes).toBe(guest.preference.notes);

    const generated = await generatePlansForRoom(room.id, host);
    if (generated.kind !== "success" || !generated.plans[0]) throw new Error("Expected a generated plan.");
    await expect(castVote(generated.plans[0].id, otherActor, "LIKE")).rejects.toThrow("You do not have access");
    await castVote(generated.plans[0].id, guestActor(guest), "LIKE");
    await finalizePlan(generated.plans[0].id, host);
    const firstItem = (await getRoomBundle(room.id, { host }))?.shopping[0];
    if (!firstItem) throw new Error("Expected a shopping item.");
    await expect(claimShoppingItem(firstItem.id, { guest: otherActor }, otherGuest.id)).rejects.toThrow(
      "You do not have access"
    );

    const publicView = await getPublicRoom(room.id);
    expect(publicView).not.toBeNull();
    const serialized = JSON.stringify(publicView);
    for (const forbidden of ["private@example.com", "private-allergy", room.inviteToken!, guest.sessionToken]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(Object.keys(publicView ?? {})).toEqual(["room", "finalPlan", "shoppingCategories"]);
  }, 30_000);

  it("persists a no-solution report without creating a votable placeholder plan", async () => {
    const room = await createRoom(host, {
      title: "No-solution integration test",
      eventType: "DINNER",
      expectedGuests: 2,
      totalBudgetCents: 100
    });
    createdRoomIds.push(room.id);
    await joinRoom({
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Budget Guest",
      canBring: false,
      preference: {
        dietType: "OMNIVORE",
        allergies: [],
        dislikes: [],
        likes: ["rice"],
        spiceLevel: "MEDIUM"
      }
    });

    const generation = await generatePlansForRoom(room.id, host);
    expect(generation.kind).toBe("no-solution");
    const bundle = await getRoomBundle(room.id, { host });
    expect(bundle?.room.status).toBe("PLANNING");
    expect(bundle?.plans).toHaveLength(0);
    expect(bundle?.room.generationReport?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "BUDGET_LIMIT" })])
    );
    expect(bundle?.room.generationReport?.closestOverBudgetPlan?.estimatedCostCents).toBeGreaterThan(100);
    expect(bundle?.activities.map((event) => event.type)).toContain("PLAN_GENERATION_FAILED");
    expect(await prisma.menuPlan.count({ where: { roomId: room.id } })).toBe(0);

    const revised = {
      title: "Budget recovered room",
      eventType: "DINNER" as const,
      expectedGuests: 2,
      totalBudgetCents: 12000
    };
    await expect(updateRoomDetails(room.id, attackerHost, revised)).rejects.toThrow("You do not have access");
    const edited = await updateRoomDetails(room.id, host, revised);
    expect(edited).toMatchObject({
      title: revised.title,
      totalBudgetCents: 12000,
      status: "COLLECTING_PREFERENCES",
      generationReport: undefined,
      generationAttemptedAt: undefined
    });
    expect(edited.inviteToken).toBe(room.inviteToken);
    expect((await generatePlansForRoom(room.id, host)).kind).toBe("success");
    await expect(updateRoomDetails(room.id, host, revised)).rejects.toThrow("Cannot update room details while the room is voting.");
    await reopenPreferences(room.id, host);
    await updateRoomDetails(room.id, host, { ...revised, totalBudgetCents: undefined });
    expect((await prisma.dinnerRoom.findUniqueOrThrow({ where: { id: room.id } })).totalBudgetCents).toBeNull();
  });

  it("invalidates failed-generation guidance only when guest inputs actually change", async () => {
    const room = await createRoom(host, {
      title: "Stale generation guidance", eventType: "DINNER", expectedGuests: 2, totalBudgetCents: 100
    });
    createdRoomIds.push(room.id);
    const input = {
      token: room.inviteToken!, submissionKey: crypto.randomUUID(), name: "Initial Guest", canBring: false,
      preference: { dietType: "OMNIVORE" as const, allergies: [], dislikes: [], likes: [], spiceLevel: "MEDIUM" as const }
    };
    const guest = await joinRoom(input);
    expect((await generatePlansForRoom(room.id, host)).kind).toBe("no-solution");
    await joinRoom(input);
    await updateGuestPreferences(guestActor(guest), {
      name: guest.name, canBring: guest.canBring, preference: guest.preference
    });
    expect((await getRoomBundle(room.id, { host }))?.room.status).toBe("PLANNING");

    await updateGuestPreferences(guestActor(guest), {
      name: guest.name, canBring: guest.canBring, preference: { ...guest.preference, allergies: ["sesame"] }
    });
    expect((await getRoomBundle(room.id, { host }))?.room).toMatchObject({
      status: "COLLECTING_PREFERENCES", generationReport: undefined, generationAttemptedAt: undefined
    });
    expect((await generatePlansForRoom(room.id, host)).kind).toBe("no-solution");
    await joinRoom({ ...input, submissionKey: crypto.randomUUID(), name: "New Guest" });
    const updated = await getRoomBundle(room.id, { host });
    expect(updated?.room).toMatchObject({
      status: "COLLECTING_PREFERENCES", generationReport: undefined, generationAttemptedAt: undefined
    });
    expect(updated?.plans).toHaveLength(0);
  }, 30_000);

  it("shares safe preparation instructions without publishing guest-specific warnings", async () => {
    const room = await createRoom(host, {
      title: "Public Hotpot preparation",
      eventType: "HOTPOT",
      expectedGuests: 2,
      totalBudgetCents: 12000,
      isPublicShareable: true
    });
    createdRoomIds.push(room.id);
    const guest = await joinRoom({
      token: room.inviteToken!,
      submissionKey: crypto.randomUUID(),
      name: "Private Spice Guest",
      email: "private-spice@example.com",
      canBring: false,
      preference: {
        dietType: "OMNIVORE",
        allergies: [],
        dislikes: [],
        likes: [],
        spiceLevel: "NONE"
      }
    });
    // Use a known adjustable dish instead of relying on the generator's top ranking.
    const dish = await prisma.dish.findFirstOrThrow({
      where: { spiceAdjustable: true, spiceLevel: { not: "NONE" } }
    });
    const plan = await prisma.menuPlan.create({
      data: {
        roomId: room.id,
        title: "Menu with optional spicy components",
        score: 100,
        estimatedCostCents: dish.estimatedCostCents,
        warnings: [{
          type: "SPICE_ADJUSTMENT",
          message: `Serve spicy components separately for ${guest.name}.`,
          affectedGuestNames: [guest.name]
        }],
        dishes: { create: { dishId: dish.id, servings: 2 } }
      }
    });
    await prisma.dinnerRoom.update({ where: { id: room.id }, data: { status: "VOTING" } });
    await finalizePlan(plan.id, host);
    const shared = await getPublicRoom(room.id);
    expect(shared?.finalPlan?.preparationNotes).toEqual(expect.arrayContaining([
      expect.stringContaining("serve spicy components separately")
    ]));
    const serialized = JSON.stringify(shared);
    for (const privateValue of [guest.name, guest.email!, room.inviteToken!, guest.sessionToken]) {
      expect(serialized).not.toContain(privateValue);
    }
  }, 30_000);
});

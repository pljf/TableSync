import { afterEach, describe, expect, it } from "vitest";
import type { GuestActor, HostActor } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
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
  updateGuestPreferences
} from "@/lib/store";

const host: HostActor = {
  kind: "host",
  userId: "user-demo-host",
  name: "Pat Host",
  email: "pat@example.com"
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

afterEach(async () => {
  if (createdRoomIds.length > 0) {
    await prisma.dinnerRoom.deleteMany({ where: { id: { in: createdRoomIds.splice(0) } } });
  }
});

describe("Prisma-backed store", () => {
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
      Array.from({ length: 5 }, () => castVote(plan.id, actor, "LIKE"))
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
    expect(updated?.plans.find((item) => item.id === plan.id)?.votes[0]?.value).toBe("LIKE");
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
        spiceLevel: "MEDIUM"
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

    expect(await getRoomBundle(room.id, { host: attackerHost })).toBeNull();
    expect(await getRoomBundle(room.id, { guest: otherActor })).toBeNull();

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
  });
});

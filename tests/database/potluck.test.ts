import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import { Prisma } from "@/generated/prisma/client";
import { AuthorizationError, type GuestActor, type HostActor } from "@/lib/authorization";
import { inspectDatabaseEnvironment } from "@/lib/database-environment";
import type { EventType } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { demoHost } from "@/lib/seed-data";
import {
  assignPotluckContribution, castVote, claimShoppingItem, createRoom, finalizePlan,
  getPublicRoom, getRoomBundle, joinRoom, reopenPreferences, setPotluckContributionReady,
  toggleShoppingItem, undoFinalization
} from "@/lib/store";

const host: HostActor = { kind: "host", userId: demoHost.id, name: demoHost.name, email: demoHost.email };
const roomIds: string[] = [];
const actor = (guest: { id: string; roomId: string; name: string }): GuestActor => ({
  kind: "guest", guestId: guest.id, roomId: guest.roomId, name: guest.name
});

beforeAll(async () => {
  await prisma.user.upsert({ where: { id: host.userId }, update: {}, create: demoHost });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.dinnerRoom.deleteMany({ where: { id: { in: roomIds.splice(0) } } });
});

async function fixture(eventType: EventType = "POTLUCK", finalize = true) {
  const room = await createRoom(host, {
    title: "Potluck contribution integration", eventType, expectedGuests: 4, totalBudgetCents: 50000, isPublicShareable: true
  });
  roomIds.push(room.id);
  const guests = [];
  for (const [index, name] of ["Contributor One", "Contributor Two", "Not Volunteering"].entries()) {
    guests.push(await joinRoom({
      token: room.inviteToken!, submissionKey: crypto.randomUUID(), name, email: `private-${index}@example.com`,
      canBring: index < 2,
      preference: { dietType: "OMNIVORE", spiceLevel: "MEDIUM", allergies: [], likes: [], dislikes: [], notes: "Private preference note" }
    }));
  }
  // Persist a known overlapping-ingredient recipe pair. Menu selection has its
  // own domain tests; these fixtures isolate ownership/shopping transactions.
  const dishes = await prisma.dish.findMany({ where: { id: { in: ["chicken-taco-bowl", "steamed-rice", "lemonade"] } } });
  expect(dishes).toHaveLength(3);
  const plan = await prisma.menuPlan.create({
    data: {
      roomId: room.id, title: "Contribution recipes", score: 100,
      estimatedCostCents: dishes.reduce((sum, dish) => sum + dish.estimatedCostCents, 0),
      dishes: { create: dishes.map((dish) => ({ dishId: dish.id, servings: dish.baseServings })) }
    },
    include: { dishes: true }
  });
  await prisma.dinnerRoom.update({ where: { id: room.id }, data: { status: "VOTING" } });
  await castVote(plan.id, actor(guests[0]), "LIKE");
  if (finalize) await finalizePlan(plan.id, host);
  return { room, guests, plan, item: plan.dishes.find((dish) => dish.dishId === "chicken-taco-bowl")! };
}

describe("Potluck contribution persistence and authorization", () => {
  it("confirms grocery changes and preserves unaffected progress, votes, budget and contribution readiness", async () => {
    const { room, guests, plan, item } = await fixture();
    const original = (await getRoomBundle(room.id, { host }))!;
    const shoppingItem = original.shopping.find((entry) => entry.ingredient.id === "lemonade")!;
    expect(shoppingItem).toBeDefined();
    if (shoppingItem.assignedToGuestId !== guests[1].id) await claimShoppingItem(shoppingItem.id, { host }, guests[1].id);
    await toggleShoppingItem(shoppingItem.id, { host }, true);
    await expect(assignPotluckContribution(item.id, { guest: actor(guests[0]) }, guests[0].id)).rejects.toThrow("Confirm that");
    const unchanged = (await getRoomBundle(room.id, { host }))!;
    expect(unchanged.shopping.find((entry) => entry.id === shoppingItem.id)?.checked).toBe(true);
    expect(unchanged.plans.find((entry) => entry.id === plan.id)?.dishes.find((entry) => entry.id === item.id)?.contributionGuestId).toBeUndefined();

    await assignPotluckContribution(item.id, { guest: actor(guests[0]) }, guests[0].id, true);
    const claimed = (await getRoomBundle(room.id, { guest: actor(guests[0]) }))!;
    const selected = claimed.plans.find((entry) => entry.id === plan.id)!;
    const contribution = selected.dishes.find((entry) => entry.id === item.id)!;
    expect(contribution).toMatchObject({ contributionGuestId: guests[0].id, contributionReady: false, servings: item.servings });
    expect(selected.estimatedCostCents).toBe(plan.estimatedCostCents);
    expect(selected.votes).toEqual(original.plans.find((entry) => entry.id === plan.id)?.votes);
    expect(claimed.shopping.find((entry) => entry.id === shoppingItem.id)).toMatchObject({ checked: true, assignedToGuestId: guests[1].id });
    expect(claimed.shopping.every((entry) => original.shopping.some((old) => old.id === entry.id))).toBe(true);
    expect(claimed.shopping.find((entry) => entry.ingredient.id === "rice")?.quantity).toBe(3);
    expect(claimed.shopping.some((entry) => entry.ingredient.id === "chicken")).toBe(false);
    const sharedCost = claimed.shopping.reduce((sum, entry) => sum + (entry.estimatedCostCents ?? 0), 0);
    expect(sharedCost + contribution.dish.estimatedCostCents).toBe(plan.estimatedCostCents);

    await setPotluckContributionReady(item.id, { guest: actor(guests[0]) }, true);
    const ready = (await getRoomBundle(room.id, { host }))!;
    expect(ready.shopping).toEqual(claimed.shopping);
    expect(ready.plans.find((entry) => entry.id === plan.id)?.dishes.find((entry) => entry.id === item.id)?.contributionReady).toBe(true);
    await expect(assignPotluckContribution(item.id, { host }, guests[0].id, true)).rejects.toThrow("unchanged");
    expect((await getRoomBundle(room.id, { host }))?.shopping).toEqual(ready.shopping);
    await assignPotluckContribution(item.id, { host }, guests[1].id);
    expect((await getRoomBundle(room.id, { host }))?.shopping).toEqual(ready.shopping);
    expect(await prisma.menuPlanDish.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({
      contributionGuestId: guests[1].id, contributionReady: false, servings: item.servings
    });
    await assignPotluckContribution(item.id, { guest: actor(guests[1]) }, undefined, true);
    const released = (await getRoomBundle(room.id, { host }))!;
    expect(released.shopping.reduce((sum, entry) => sum + (entry.estimatedCostCents ?? 0), 0)).toBe(plan.estimatedCostCents);
    expect(released.shopping.find((entry) => entry.id === shoppingItem.id)).toMatchObject({ checked: true, assignedToGuestId: guests[1].id });
  }, 30_000);

  it("retains checked reduced quantities and manual unassignments, then clears only increased quantity checks on release", async () => {
    const { room, guests, item } = await fixture();
    const original = (await getRoomBundle(room.id, { host }))!;
    const rice = original.shopping.find((entry) => entry.ingredient.id === "rice")!;
    const lemon = original.shopping.find((entry) => entry.ingredient.id === "lemonade")!;
    await claimShoppingItem(rice.id, { host });
    await toggleShoppingItem(rice.id, { host }, true);
    await toggleShoppingItem(lemon.id, { host }, true);
    await assignPotluckContribution(item.id, { host }, guests[0].id, true);
    const claimed = (await getRoomBundle(room.id, { host }))!;
    expect(claimed.shopping.find((entry) => entry.id === rice.id)).toMatchObject({ quantity: 3, checked: true, assignedToGuestId: undefined });
    await assignPotluckContribution(item.id, { host }, undefined, true);
    const released = (await getRoomBundle(room.id, { host }))!;
    expect(released.shopping.find((entry) => entry.ingredient.id === "rice")).toMatchObject({ quantity: rice.quantity, checked: false, assignedToGuestId: undefined });
    expect(released.shopping.some((entry) => entry.id === rice.id)).toBe(false);
    await expect(toggleShoppingItem(rice.id, { host }, true)).rejects.toThrow("You do not have access");
    expect(released.shopping.find((entry) => entry.id === lemon.id)?.checked).toBe(true);
    expect(released.shopping.find((entry) => entry.ingredient.id === "chicken")?.checked).toBe(false);
  }, 30_000);

  it("serializes competing guest claims and prevents stealing, releasing, or changing another contribution", async () => {
    const { room, guests, item } = await fixture();
    const attempts = await Promise.allSettled(guests.slice(0, 2).map((guest) =>
      assignPotluckContribution(item.id, { guest: actor(guest) }, guest.id, true)));
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const persisted = await prisma.menuPlanDish.findUniqueOrThrow({ where: { id: item.id } });
    const owner = guests.find((guest) => guest.id === persisted.contributionGuestId)!;
    const other = guests.find((guest) => guest.canBring && guest.id !== owner.id)!;
    await expect(assignPotluckContribution(item.id, { guest: actor(other) }, other.id, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution(item.id, { guest: actor(other) }, undefined, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution(item.id, { guest: actor(owner) }, other.id, true)).rejects.toThrow("You do not have access");
    await expect(setPotluckContributionReady(item.id, { guest: actor(other) }, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution(item.id, { host }, guests[2].id, true)).rejects.toThrow("has not volunteered");
    expect(await prisma.activityEvent.count({ where: { roomId: room.id, type: "CONTRIBUTION_ASSIGNED" } })).toBe(1);
    await setPotluckContributionReady(item.id, { host }, true);
    await expect(setPotluckContributionReady(item.id, { host }, true)).rejects.toThrow("unchanged");
  }, 30_000);

  it("waits for an independent connection and rejects ownership committed while waiting", async () => {
    const { room, guests, item } = await fixture();
    const before = (await getRoomBundle(room.id, { host }))!;
    const connectionString = inspectDatabaseEnvironment().runtime?.raw;
    if (!connectionString) throw new Error("A configured runtime database is required for the independent-connection check.");
    const blocker = new Client({ connectionString, connectionTimeoutMillis: 5_000, query_timeout: 5_000 });
    const connectionErrors: Error[] = [];
    blocker.on("error", (error: Error) => connectionErrors.push(error));
    let transactionOpen = false;
    let attempt: Promise<PromiseSettledResult<string>> | undefined;
    try {
      await blocker.connect();
      await blocker.query("BEGIN");
      transactionOpen = true;
      await blocker.query('SELECT "id" FROM "DinnerRoom" WHERE "id" = $1 FOR UPDATE', [room.id]);

      // This socket is independent of Prisma's size-one pool. A full PostgreSQL
      // server waits on the room row lock; local PGlite queues transactions.
      // Both must defer the app's ownership read until the external commit.
      attempt = assignPotluckContribution(item.id, { guest: actor(guests[1]) }, guests[1].id, true).then(
        (value): PromiseFulfilledResult<string> => ({ status: "fulfilled", value }),
        (reason: unknown): PromiseRejectedResult => ({ status: "rejected", reason })
      );
      expect(await Promise.race([
        attempt.then(() => "settled"),
        delay(200).then(() => "waiting")
      ]), "The application claim must wait while the independent transaction holds the room.").toBe("waiting");

      // A controlled fixture write represents a different contributor winning
      // before the waiting request may read ownership. It touches no other room.
      await blocker.query(
        'UPDATE "MenuPlanDish" SET "contributionGuestId" = $1, "contributionReady" = true WHERE "id" = $2',
        [guests[0].id, item.id]
      );
      await blocker.query("COMMIT");
      transactionOpen = false;
      const result = await attempt;
      expect(result.status).toBe("rejected");
      if (result.status !== "rejected") throw new Error("The waiting guest stole the committed contribution.");
      expect(result.reason).toBeInstanceOf(AuthorizationError);
      expect(await prisma.menuPlanDish.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({
        contributionGuestId: guests[0].id, contributionReady: true, servings: item.servings
      });
      const after = (await getRoomBundle(room.id, { host }))!;
      expect(after.shopping).toEqual(before.shopping);
      expect(after.activities).toEqual(before.activities);
      expect(after.plans.map((plan) => plan.votes)).toEqual(before.plans.map((plan) => plan.votes));
      expect(connectionErrors).toEqual([]);
    } finally {
      // Release the external lock even if the waiting assertion fails, then
      // drain the observed request before fixture cleanup deletes its room.
      try {
        if (transactionOpen) await blocker.query("ROLLBACK");
      } finally {
        try {
          await blocker.end();
        } finally {
          if (attempt) await attempt;
        }
      }
    }
  }, 30_000);

  it("denies anonymous and cross-room IDs, including a forged room scope", async () => {
    const { guests, item } = await fixture();
    const other = await fixture();
    await expect(assignPotluckContribution(item.id, {}, guests[0].id, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution(item.id, { host: { ...host, userId: "another-host" } }, guests[0].id, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution(item.id, { host }, other.guests[0].id, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution(item.id, { guest: actor(other.guests[0]) }, other.guests[0].id, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution(item.id, { guest: { ...actor(other.guests[0]), roomId: guests[0].roomId } }, guests[0].id, true)).rejects.toThrow("You do not have access");
    await expect(assignPotluckContribution("missing-row-id", { host }, guests[0].id, true)).rejects.toThrow("You do not have access");
  }, 30_000);

  it("locks contribution changes to the finalized Potluck menu and clears ownership when returning to voting", async () => {
    const { room, guests, plan, item } = await fixture("POTLUCK", false);
    await expect(assignPotluckContribution(item.id, { host }, guests[0].id, true)).rejects.toThrow("unless a Potluck menu is finalized");
    await finalizePlan(plan.id, host);
    const otherPlan = await prisma.menuPlan.create({ data: {
      roomId: room.id, title: "Unselected", score: 1, estimatedCostCents: 100,
      dishes: { create: { dishId: item.dishId, servings: item.servings } }
    }, include: { dishes: true } });
    await expect(assignPotluckContribution(otherPlan.dishes[0].id, { host }, guests[0].id, true)).rejects.toThrow("menu that is not finalized");
    await expect(setPotluckContributionReady(item.id, { host }, true)).rejects.toThrow("unclaimed");
    await assignPotluckContribution(item.id, { host }, guests[0].id, true);
    await setPotluckContributionReady(item.id, { host }, true);
    await undoFinalization(room.id, host);
    expect(await prisma.menuPlanDish.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ contributionGuestId: null, contributionReady: false });
    expect(await prisma.shoppingItem.count({ where: { roomId: room.id } })).toBe(0);
    expect(await prisma.vote.count({ where: { planId: plan.id } })).toBe(1);
    await expect(setPotluckContributionReady(item.id, { host }, true)).rejects.toThrow("unless a Potluck menu is finalized");
    await finalizePlan(plan.id, host);
    expect((await getRoomBundle(room.id, { host }))!.shopping.length).toBeGreaterThan(0);
    await undoFinalization(room.id, host);
    await reopenPreferences(room.id, host);
    expect(await prisma.menuPlanDish.count({ where: { planId: plan.id } })).toBe(0);
  }, 30_000);

  it.each(["DINNER", "HOTPOT", "BBQ", "PICNIC", "BRUNCH", "OTHER"] as const)("does not permit contributions in %s", async (eventType) => {
    const { guests, item } = await fixture(eventType);
    await expect(assignPotluckContribution(item.id, { host }, guests[0].id, true)).rejects.toThrow("unless a Potluck menu is finalized");
  }, 30_000);

  it("supports all dishes claimed, then rebuilds shared groceries when a contribution is released", async () => {
    const { room, guests, plan } = await fixture();
    for (const item of plan.dishes) await assignPotluckContribution(item.id, { host }, guests[0].id, true);
    expect((await getRoomBundle(room.id, { host }))?.shopping).toEqual([]);
    await assignPotluckContribution(plan.dishes[0].id, { guest: actor(guests[0]) });
    expect((await getRoomBundle(room.id, { host }))!.shopping.length).toBeGreaterThan(0);
  }, 30_000);

  it("rolls ownership, readiness and shopping back together when the transaction fails", async () => {
    const { room, guests, item } = await fixture();
    const before = (await getRoomBundle(room.id, { host }))!;
    const transaction = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, "$transaction").mockImplementationOnce((async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      transaction(async (tx) => {
        vi.spyOn(tx.activityEvent, "createMany").mockRejectedValueOnce(new Error("Injected activity write failure"));
        return callback(tx);
      })) as typeof prisma.$transaction);
    await expect(assignPotluckContribution(item.id, { host }, guests[0].id, true)).rejects.toThrow("Injected activity write failure");
    const after = (await getRoomBundle(room.id, { host }))!;
    expect(after.shopping).toEqual(before.shopping);
    expect(after.plans).toEqual(before.plans);
    expect(after.activities).toEqual(before.activities);
  }, 30_000);

  it("exposes only aggregate contribution progress on public sharing and rejects stale shopping IDs", async () => {
    const { room, guests, item } = await fixture();
    const oldShoppingId = (await getRoomBundle(room.id, { host }))!.shopping.find((entry) => entry.ingredient.id === "chicken")!.id;
    await assignPotluckContribution(item.id, { host }, guests[0].id, true);
    await setPotluckContributionReady(item.id, { guest: actor(guests[0]) }, true);
    await expect(claimShoppingItem(oldShoppingId, { host }, guests[0].id)).rejects.toThrow("You do not have access");
    const shared = (await getPublicRoom(room.id))!;
    expect(shared.room.eventType).toBe("POTLUCK");
    expect(shared.finalPlan?.contributionSummary).toEqual({ claimedDishes: 1, readyDishes: 1, totalDishes: 3 });
    expect(shared.finalPlan?.preparationNotes).toEqual(expect.arrayContaining([
      "Bring each claimed dish in its planned quantity and mark it ready when prepared."
    ]));
    expect(new Set(shared.finalPlan?.preparationNotes).size).toBe(shared.finalPlan?.preparationNotes.length);
    const serialized = JSON.stringify(shared);
    for (const secret of [guests[0].id, guests[0].name, guests[0].email!, guests[0].sessionToken, room.inviteToken!, "Private preference note", "contributionGuestId"]) {
      expect(serialized).not.toContain(secret);
    }
  }, 30_000);
});

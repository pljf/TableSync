import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { HostActor } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { demoHost } from "@/lib/seed-data";
import { createRoom, finalizePlan, getRoomBundle, joinRoom } from "@/lib/store";
import { summarizeShoppingBudgets } from "@/lib/shopping-engine/budget-summary";

const host: HostActor = { kind: "host", userId: demoHost.id, name: demoHost.name, email: demoHost.email };
const roomIds: string[] = [];
beforeAll(async () => { await prisma.user.upsert({ where: { id: host.userId }, update: {}, create: demoHost }); });
afterEach(async () => { await prisma.dinnerRoom.deleteMany({ where: { id: { in: roomIds.splice(0) } } }); });

async function finalizeWithBudgets(budgets: number[]) {
  const room = await createRoom(host, { title: "Shopping budget regression", eventType: "DINNER", expectedGuests: 4 });
  roomIds.push(room.id);
  for (const [index, maxBudgetCents] of budgets.entries()) {
    await joinRoom({ token: room.inviteToken!, submissionKey: crypto.randomUUID(), name: `Budget guest ${index}`, canBring: true,
      preference: { dietType: "OMNIVORE", allergies: [], dislikes: [], likes: [], spiceLevel: "MILD", maxBudgetCents } });
  }
  const dishes = await prisma.dish.findMany({ where: { id: { in: ["chicken-taco-bowl", "steamed-rice"] } } });
  expect(dishes).toHaveLength(2);
  const plan = await prisma.menuPlan.create({ data: { roomId: room.id, title: "Shopping budget menu", score: 100,
    estimatedCostCents: dishes.reduce((sum, dish) => sum + dish.estimatedCostCents, 0),
    dishes: { create: dishes.map((dish) => ({ dishId: dish.id, servings: dish.baseServings })) } } });
  await prisma.dinnerRoom.update({ where: { id: room.id }, data: { status: "VOTING" } });
  await finalizePlan(plan.id, host);
  return (await getRoomBundle(room.id, { host }))!;
}

describe("persisted shopping estimates and budgets", () => {
  it("persists weighted ingredients and keeps a zero-comfort guest unassigned", async () => {
    const bundle = await finalizeWithBudgets([0, 10000]);
    const zeroGuest = bundle.guests.find((guest) => guest.preference.maxBudgetCents === 0)!;
    const fundedGuest = bundle.guests.find((guest) => guest.preference.maxBudgetCents === 10000)!;
    expect(bundle.shopping.every((item) => item.assignedToGuestId === fundedGuest.id)).toBe(true);
    expect(bundle.shopping.every((item) => item.assignedToGuestId !== zeroGuest.id)).toBe(true);
    const chicken = bundle.shopping.find((item) => item.ingredient.id === "chicken")!;
    const rice = bundle.shopping.find((item) => item.ingredient.id === "rice")!;
    expect(chicken.estimatedCostCents).toBeGreaterThan(rice.estimatedCostCents!);
    const plan = bundle.plans.find((plan) => plan.status === "FINALIZED")!;
    expect(bundle.shopping.reduce((sum, item) => sum + item.estimatedCostCents!, 0)).toBe(plan.estimatedCostCents);
  });

  it("persists unassigned groceries when no volunteer's remaining comfort can cover them", async () => {
    const bundle = await finalizeWithBudgets([200, 200]);
    const summary = summarizeShoppingBudgets(bundle.shopping, bundle.guests.map((guest) => ({ ...guest, maxBudgetCents: guest.preference.maxBudgetCents })));
    expect(summary.unassignedCount).toBeGreaterThan(0);
    expect(summary.budgetBlockedCount).toBeGreaterThan(0);
    expect(summary.totals.every((entry) => entry.overByCents === 0)).toBe(true);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  castVote,
  claimShoppingItem,
  createRoom,
  finalizePlan,
  generatePlansForRoom,
  getRoomBundle,
  joinRoom,
  toggleShoppingItem
} from "@/lib/store";

const createdRoomIds: string[] = [];

afterEach(async () => {
  if (createdRoomIds.length > 0) {
    await prisma.dinnerRoom.deleteMany({
      where: {
        id: {
          in: createdRoomIds.splice(0)
        }
      }
    });
  }
});

describe("Prisma-backed store", () => {
  it("persists rooms, guests, preferences, and activity", async () => {
    const room = await createRoom({
      hostId: "user-demo-host",
      title: "Database integration test",
      eventType: "DINNER",
      expectedGuests: 4
    });
    createdRoomIds.push(room.id);

    const guest = await joinRoom({
      token: room.inviteToken,
      name: "Integration Guest",
      canBring: true,
      preference: {
        dietType: "VEGETARIAN",
        allergies: ["peanut"],
        dislikes: [],
        likes: ["mushrooms"],
        spiceLevel: "MILD"
      }
    });

    const bundle = await getRoomBundle(room.id);
    const persistedRoom = await prisma.dinnerRoom.findUnique({
      where: {
        id: room.id
      },
      include: {
        guests: {
          include: {
            preference: true
          }
        },
        activities: true
      }
    });

    expect(bundle?.guests.map((item) => item.id)).toContain(guest.id);
    expect(persistedRoom?.guests[0]?.preference?.dietType).toBe("VEGETARIAN");
    expect(persistedRoom?.activities.map((event) => event.type)).toEqual(
      expect.arrayContaining(["ROOM_CREATED", "GUEST_JOINED"])
    );
  });

  it("persists planning, voting, finalization, and shopping mutations", async () => {
    const room = await createRoom({
      hostId: "user-demo-host",
      title: "Workflow integration test",
      eventType: "DINNER",
      expectedGuests: 4,
      totalBudgetCents: 12000
    });
    createdRoomIds.push(room.id);

    const guest = await joinRoom({
      token: room.inviteToken,
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
    const plans = await generatePlansForRoom(room.id);
    const plan = plans[0];
    expect(plan).toBeDefined();
    if (!plan) {
      return;
    }

    await castVote(plan.id, guest.id, "LIKE");
    await finalizePlan(plan.id);

    const finalized = await getRoomBundle(room.id);
    const firstItem = finalized?.shopping[0];
    expect(firstItem).toBeDefined();
    if (!firstItem) {
      return;
    }

    await claimShoppingItem(firstItem.id, guest.id);
    await toggleShoppingItem(firstItem.id, true);

    const updated = await getRoomBundle(room.id);
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
  });
});

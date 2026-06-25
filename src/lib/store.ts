import type {
  ActivityEvent,
  DinnerRoom,
  Dish,
  EventType,
  Guest,
  Ingredient,
  MenuPlan,
  PlanWarning,
  Preference,
  RoomBundle,
  ShoppingItem,
  User,
  Vote,
  VoteValue
} from "@/lib/domain";
import { generateMenuPlans } from "@/lib/menu-engine/generate-menu-plans";
import { prisma } from "@/lib/prisma";
import { demoHost } from "@/lib/seed-data";
import { generateShoppingList } from "@/lib/shopping-engine/generate-shopping-list";
import type { Prisma } from "@/generated/prisma/client";

type CreateRoomInput = {
  hostId: string;
  title: string;
  description?: string;
  eventType: EventType;
  dateTime?: string;
  location?: string;
  totalBudgetCents?: number;
  expectedGuests: number;
  isPublicShareable?: boolean;
};

type JoinRoomInput = {
  token: string;
  name: string;
  email?: string;
  preference: Omit<Preference, "id" | "guestId">;
  canBring: boolean;
};

const roomBundleInclude = {
  guests: {
    include: {
      preference: true
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  plans: {
    include: {
      dishes: {
        include: {
          dish: {
            include: {
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          }
        }
      },
      votes: true
    },
    orderBy: {
      score: "desc"
    }
  },
  shopping: {
    include: {
      ingredient: true
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  activities: {
    orderBy: {
      createdAt: "desc"
    }
  }
} satisfies Prisma.DinnerRoomInclude;

const dishCatalogInclude = {
  ingredients: {
    include: {
      ingredient: true
    }
  }
} satisfies Prisma.DishInclude;

type DbRoomBundle = Prisma.DinnerRoomGetPayload<{ include: typeof roomBundleInclude }>;
type DbDish = Prisma.DishGetPayload<{ include: typeof dishCatalogInclude }>;
type DbGuest = DbRoomBundle["guests"][number];
type DbPlan = DbRoomBundle["plans"][number];
type DbShoppingItem = DbRoomBundle["shopping"][number];
type DbActivity = DbRoomBundle["activities"][number];

function toIso(value: Date): string {
  return value.toISOString();
}

function optional<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

function mapUser(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}): User {
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    image: optional(user.image)
  };
}

function mapRoom(room: DbRoomBundle | Prisma.DinnerRoomGetPayload<Record<string, never>>): DinnerRoom {
  return {
    id: room.id,
    hostId: room.hostId,
    title: room.title,
    description: optional(room.description),
    eventType: room.eventType,
    dateTime: room.dateTime ? toIso(room.dateTime) : undefined,
    location: optional(room.location),
    totalBudgetCents: optional(room.totalBudgetCents),
    expectedGuests: optional(room.expectedGuests),
    status: room.status,
    inviteToken: room.inviteToken,
    isPublicShareable: room.isPublicShareable,
    createdAt: toIso(room.createdAt),
    updatedAt: toIso(room.updatedAt)
  };
}

function mapPreference(preference: NonNullable<DbGuest["preference"]>): Preference {
  return {
    id: preference.id,
    guestId: preference.guestId,
    dietType: preference.dietType,
    allergies: preference.allergies,
    dislikes: preference.dislikes,
    likes: preference.likes,
    spiceLevel: preference.spiceLevel,
    maxBudgetCents: optional(preference.maxBudgetCents),
    notes: optional(preference.notes)
  };
}

function mapGuest(guest: DbGuest): Guest {
  if (!guest.preference) {
    throw new Error(`Guest ${guest.id} is missing a preference record.`);
  }

  return {
    id: guest.id,
    roomId: guest.roomId,
    name: guest.name,
    email: optional(guest.email),
    editToken: guest.editToken,
    isHostGuest: guest.isHostGuest,
    canBring: guest.canBring,
    createdAt: toIso(guest.createdAt),
    updatedAt: toIso(guest.updatedAt),
    preference: mapPreference(guest.preference)
  };
}

function mapIngredient(ingredient: {
  id: string;
  name: string;
  category: Ingredient["category"];
  defaultUnit: string;
  tags: string[];
}): Ingredient {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    defaultUnit: ingredient.defaultUnit,
    tags: ingredient.tags
  };
}

function mapDish(dish: DbDish): Dish {
  return {
    id: dish.id,
    name: dish.name,
    description: optional(dish.description),
    category: dish.category,
    cuisine: dish.cuisine,
    baseServings: dish.baseServings,
    estimatedCostCents: dish.estimatedCostCents,
    prepTimeMinutes: dish.prepTimeMinutes,
    spiceLevel: dish.spiceLevel,
    tags: dish.tags,
    ingredients: dish.ingredients.map((item) => ({
      ingredient: mapIngredient(item.ingredient),
      quantity: item.quantity,
      unit: item.unit
    }))
  };
}

function mapVote(vote: DbPlan["votes"][number]): Vote {
  return {
    id: vote.id,
    planId: vote.planId,
    guestId: vote.guestId,
    value: vote.value,
    reason: optional(vote.reason),
    createdAt: toIso(vote.createdAt),
    updatedAt: toIso(vote.updatedAt)
  };
}

function mapWarnings(value: Prisma.JsonValue | null): PlanWarning[] {
  return Array.isArray(value) ? (value as unknown as PlanWarning[]) : [];
}

function mapPlan(plan: DbPlan): MenuPlan {
  return {
    id: plan.id,
    roomId: plan.roomId,
    title: plan.title,
    summary: plan.summary ?? "",
    score: plan.score,
    estimatedCostCents: plan.estimatedCostCents,
    status: plan.status,
    warnings: mapWarnings(plan.warnings),
    dishes: plan.dishes.map((item) => ({
      dish: mapDish(item.dish),
      servings: item.servings
    })),
    votes: plan.votes.map(mapVote),
    createdAt: toIso(plan.createdAt),
    updatedAt: toIso(plan.updatedAt)
  };
}

function mapShoppingItem(item: DbShoppingItem): ShoppingItem {
  return {
    id: item.id,
    roomId: item.roomId,
    ingredient: mapIngredient(item.ingredient),
    quantity: item.quantity,
    unit: item.unit,
    estimatedCostCents: optional(item.estimatedCostCents),
    assignedToGuestId: optional(item.assignedToGuestId),
    checked: item.checked,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt)
  };
}

function mapMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function mapActivity(activity: DbActivity): ActivityEvent {
  return {
    id: activity.id,
    roomId: activity.roomId,
    actorName: activity.actorName,
    type: activity.type,
    message: activity.message,
    metadata: mapMetadata(activity.metadata),
    createdAt: toIso(activity.createdAt)
  };
}

function mapRoomBundle(room: DbRoomBundle): RoomBundle {
  return {
    room: mapRoom(room),
    guests: room.guests.map(mapGuest),
    plans: room.plans.map(mapPlan),
    shopping: room.shopping.map(mapShoppingItem),
    activities: room.activities.map(mapActivity)
  };
}

async function getDishCatalog(): Promise<Dish[]> {
  const dishes = await prisma.dish.findMany({
    include: dishCatalogInclude,
    orderBy: {
      name: "asc"
    }
  });
  return dishes.map(mapDish);
}

export async function getDemoHost(): Promise<User> {
  const user = await prisma.user.upsert({
    where: {
      email: demoHost.email
    },
    update: {
      name: demoHost.name
    },
    create: demoHost
  });
  return mapUser(user);
}

export async function listRoomsForHost(hostId: string): Promise<DinnerRoom[]> {
  const rooms = await prisma.dinnerRoom.findMany({
    where: {
      hostId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
  return rooms.map(mapRoom);
}

export async function getRoomBundle(roomId: string): Promise<RoomBundle | null> {
  const room = await prisma.dinnerRoom.findUnique({
    where: {
      id: roomId
    },
    include: roomBundleInclude
  });
  return room ? mapRoomBundle(room) : null;
}

export async function getRoomByInviteToken(token: string): Promise<RoomBundle | null> {
  const room = await prisma.dinnerRoom.findUnique({
    where: {
      inviteToken: token
    },
    select: {
      id: true
    }
  });
  return room ? getRoomBundle(room.id) : null;
}

export async function getPublicRoom(roomId: string): Promise<RoomBundle | null> {
  const bundle = await getRoomBundle(roomId);
  if (!bundle || !bundle.room.isPublicShareable || bundle.room.status !== "FINALIZED") {
    return null;
  }
  return bundle;
}

export async function createRoom(input: CreateRoomInput): Promise<DinnerRoom> {
  const room = await prisma.dinnerRoom.create({
    data: {
      hostId: input.hostId,
      title: input.title,
      description: input.description,
      eventType: input.eventType,
      dateTime: input.dateTime ? new Date(input.dateTime) : undefined,
      location: input.location,
      totalBudgetCents: input.totalBudgetCents,
      expectedGuests: input.expectedGuests,
      status: "COLLECTING_PREFERENCES",
      inviteToken: crypto.randomUUID(),
      isPublicShareable: input.isPublicShareable ?? false,
      activities: {
        create: {
          actorName: "Host",
          type: "ROOM_CREATED",
          message: `Created ${input.title}.`
        }
      }
    }
  });
  return mapRoom(room);
}

export async function joinRoom(input: JoinRoomInput): Promise<Guest> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.dinnerRoom.findUnique({
      where: {
        inviteToken: input.token
      },
      select: {
        id: true
      }
    });
    if (!room) {
      throw new Error("Invite link is invalid.");
    }

    const guest = await tx.guest.create({
      data: {
        roomId: room.id,
        name: input.name,
        email: input.email,
        editToken: crypto.randomUUID(),
        canBring: input.canBring,
        preference: {
          create: input.preference
        }
      },
      include: {
        preference: true
      }
    });

    await tx.dinnerRoom.update({
      where: {
        id: room.id
      },
      data: {
        status: "COLLECTING_PREFERENCES"
      }
    });
    await tx.activityEvent.create({
      data: {
        roomId: room.id,
        actorName: guest.name,
        type: "GUEST_JOINED",
        message: `${guest.name} submitted preferences.`
      }
    });

    return mapGuest(guest);
  });
}

export async function generatePlansForRoom(roomId: string): Promise<MenuPlan[]> {
  const bundle = await getRoomBundle(roomId);
  if (!bundle) {
    throw new Error("Room not found.");
  }

  const dishes = await getDishCatalog();
  if (dishes.length === 0) {
    throw new Error("Dish catalog is empty. Run npm run db:seed.");
  }

  const generated = generateMenuPlans({
    room: bundle.room,
    guests: bundle.guests,
    dishes
  });

  await prisma.$transaction(async (tx) => {
    await tx.menuPlan.deleteMany({
      where: {
        roomId,
        status: {
          not: "FINALIZED"
        }
      }
    });

    for (const plan of generated) {
      await tx.menuPlan.create({
        data: {
          roomId,
          title: plan.title,
          summary: plan.summary,
          score: plan.score,
          estimatedCostCents: plan.estimatedCostCents,
          warnings: plan.warnings as unknown as Prisma.InputJsonValue,
          dishes: {
            create: plan.dishes.map((item) => ({
              dishId: item.dish.id,
              servings: item.servings
            }))
          }
        }
      });
    }

    await tx.dinnerRoom.update({
      where: {
        id: roomId
      },
      data: {
        status: "VOTING"
      }
    });
    await tx.activityEvent.create({
      data: {
        roomId,
        actorName: "TableSync",
        type: "PLANS_GENERATED",
        message: `Generated ${generated.length} menu plans.`
      }
    });
  });

  const updated = await getRoomBundle(roomId);
  return updated?.plans.filter((plan) => plan.status === "PROPOSED") ?? [];
}

export async function castVote(planId: string, guestId: string, value: VoteValue, reason?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const [plan, guest] = await Promise.all([
      tx.menuPlan.findUnique({
        where: {
          id: planId
        },
        select: {
          roomId: true,
          title: true
        }
      }),
      tx.guest.findUnique({
        where: {
          id: guestId
        },
        select: {
          roomId: true,
          name: true
        }
      })
    ]);

    if (!plan || !guest || plan.roomId !== guest.roomId) {
      throw new Error("Plan or guest was not found.");
    }

    await tx.vote.upsert({
      where: {
        planId_guestId: {
          planId,
          guestId
        }
      },
      update: {
        value,
        reason
      },
      create: {
        planId,
        guestId,
        value,
        reason
      }
    });
    await tx.menuPlan.update({
      where: {
        id: planId
      },
      data: {
        updatedAt: new Date()
      }
    });
    await tx.activityEvent.create({
      data: {
        roomId: plan.roomId,
        actorName: guest.name,
        type: "VOTE_CAST",
        message: `${guest.name} voted ${value.toLowerCase()} on ${plan.title}.`
      }
    });
  });
}

export async function finalizePlan(planId: string): Promise<void> {
  const plan = await prisma.menuPlan.findUnique({
    where: {
      id: planId
    },
    select: {
      roomId: true
    }
  });
  if (!plan) {
    throw new Error("Plan not found.");
  }

  const bundle = await getRoomBundle(plan.roomId);
  if (!bundle) {
    throw new Error("Room not found.");
  }
  const selectedPlan = bundle.plans.find((item) => item.id === planId);
  if (!selectedPlan) {
    throw new Error("Plan not found.");
  }

  const shopping = generateShoppingList({
    room: bundle.room,
    guests: bundle.guests,
    plan: selectedPlan
  });

  await prisma.$transaction(async (tx) => {
    await tx.menuPlan.updateMany({
      where: {
        roomId: bundle.room.id
      },
      data: {
        status: "PROPOSED"
      }
    });
    await tx.menuPlan.update({
      where: {
        id: planId
      },
      data: {
        status: "FINALIZED"
      }
    });
    await tx.dinnerRoom.update({
      where: {
        id: bundle.room.id
      },
      data: {
        status: "FINALIZED"
      }
    });
    await tx.shoppingItem.deleteMany({
      where: {
        roomId: bundle.room.id
      }
    });
    await tx.shoppingItem.createMany({
      data: shopping.map((item) => ({
        roomId: bundle.room.id,
        ingredientId: item.ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
        estimatedCostCents: item.estimatedCostCents,
        assignedToGuestId: item.assignedToGuestId
      }))
    });
    await tx.activityEvent.createMany({
      data: [
        {
          roomId: bundle.room.id,
          actorName: "Host",
          type: "PLAN_FINALIZED",
          message: `Finalized ${selectedPlan.title}.`
        },
        {
          roomId: bundle.room.id,
          actorName: "TableSync",
          type: "SHOPPING_GENERATED",
          message: "Generated and assigned the shopping list."
        }
      ]
    });
  });
}

export async function claimShoppingItem(itemId: string, guestId?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.shoppingItem.findUnique({
      where: {
        id: itemId
      },
      include: {
        ingredient: true
      }
    });
    if (!item) {
      throw new Error("Shopping item not found.");
    }

    const guest = guestId
      ? await tx.guest.findUnique({
          where: {
            id: guestId
          },
          select: {
            id: true,
            roomId: true,
            name: true
          }
        })
      : null;
    if (guestId && (!guest || guest.roomId !== item.roomId)) {
      throw new Error("Guest was not found in this room.");
    }

    await tx.shoppingItem.update({
      where: {
        id: itemId
      },
      data: {
        assignedToGuestId: guest?.id ?? null
      }
    });
    await tx.activityEvent.create({
      data: {
        roomId: item.roomId,
        actorName: guest?.name ?? "Host",
        type: "ITEM_ASSIGNED",
        message: `${item.ingredient.name} was ${guest ? `assigned to ${guest.name}` : "unassigned"}.`
      }
    });
  });
}

export async function toggleShoppingItem(itemId: string, checked: boolean): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.shoppingItem.findUnique({
      where: {
        id: itemId
      },
      include: {
        ingredient: true
      }
    });
    if (!item) {
      throw new Error("Shopping item not found.");
    }

    await tx.shoppingItem.update({
      where: {
        id: itemId
      },
      data: {
        checked
      }
    });
    await tx.activityEvent.create({
      data: {
        roomId: item.roomId,
        actorName: "Shopper",
        type: "ITEM_CHECKED",
        message: `${item.ingredient.name} was marked ${checked ? "purchased" : "not purchased"}.`
      }
    });
  });
}

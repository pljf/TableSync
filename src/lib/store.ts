import type {
  ActivityEvent,
  DinnerRoom,
  Dish,
  EventType,
  Guest,
  Ingredient,
  InviteRoomView,
  MenuGenerationResult,
  MenuPlan,
  NoSolutionReport,
  PlanWarning,
  Preference,
  PublicRoomView,
  RoomBundle,
  ShoppingItem,
  Vote,
  VoteValue
} from "@/lib/domain";
import {
  AuthorizationError,
  assertGuestBelongsToRoom,
  assertGuestOwnsResource,
  assertHostOwnsResource,
  isOwningHost,
  isRoomGuest,
  type GuestActor,
  type HostActor,
  type RequestActors
} from "@/lib/authorization";
import {
  deriveGuestSessionToken,
  GUEST_SESSION_SECONDS,
  hashGuestSessionToken
} from "@/lib/guest-session";
import { generateMenuPlans } from "@/lib/menu-engine/generate-menu-plans";
import { eventFormats } from "@/lib/event-formats";
import { prisma } from "@/lib/prisma";
import { generateShoppingList } from "@/lib/shopping-engine/generate-shopping-list";
import { reconcileShoppingList } from "@/lib/shopping-engine/reconcile-shopping-list";
import { assertWorkflowActionAllowed } from "@/lib/workflow/state-machine";
import { Prisma } from "@/generated/prisma/client";

type CreateRoomInput = {
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
  submissionKey: string;
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
    orderBy: [{ score: "desc" }, { createdAt: "asc" }, { id: "asc" }]
  },
  shopping: {
    include: {
      ingredient: true
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
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

function sameStringList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function mapNoSolutionReport(value: Prisma.JsonValue | null): NoSolutionReport | undefined {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }

  const report = value as unknown as NoSolutionReport;
  if (typeof report.summary !== "string" || !Array.isArray(report.issues) || typeof report.eventType !== "string") {
    return undefined;
  }
  return report;
}

function mapRoom(
  room: DbRoomBundle | Prisma.DinnerRoomGetPayload<Record<string, never>>,
  includeInviteToken = true
): DinnerRoom {
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
    inviteToken: includeInviteToken ? room.inviteToken : undefined,
    isPublicShareable: room.isPublicShareable,
    generationReport: mapNoSolutionReport(room.generationReport),
    generationAttemptedAt: room.generationAttemptedAt ? toIso(room.generationAttemptedAt) : undefined,
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

function mapGuest(guest: DbGuest, includePrivateDetails = true): Guest {
  if (!guest.preference) {
    throw new Error(`Guest ${guest.id} is missing a preference record.`);
  }

  return {
    id: guest.id,
    roomId: guest.roomId,
    name: guest.name,
    email: includePrivateDetails ? optional(guest.email) : undefined,
    isHostGuest: guest.isHostGuest,
    canBring: guest.canBring,
    createdAt: toIso(guest.createdAt),
    updatedAt: toIso(guest.updatedAt),
    preference: {
      ...mapPreference(guest.preference),
      notes: includePrivateDetails ? optional(guest.preference.notes) : undefined
    }
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
    spiceAdjustable: dish.spiceAdjustable,
    supportedEventTypes: dish.supportedEventTypes,
    hotpotRole: optional(dish.hotpotRole),
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
      id: item.id,
      dish: mapDish(item.dish),
      servings: item.servings,
      contributionGuestId: optional(item.contributionGuestId),
      contributionReady: item.contributionReady
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

function mapRoomBundle(room: DbRoomBundle, audience: "host" | "guest" = "host"): RoomBundle {
  const isHostAudience = audience === "host";
  return {
    room: mapRoom(room, isHostAudience),
    guests: room.guests.map((guest) => mapGuest(guest, isHostAudience)),
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

async function lockRoom(tx: Prisma.TransactionClient, roomId: string): Promise<void> {
  // Every room mutation takes this lock before reading workflow state or child records.
  // Menu generation must use the same locked preference snapshot that it publishes.
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "DinnerRoom" WHERE "id" = ${roomId} FOR UPDATE`);
}

export async function listRoomsForHost(actor: HostActor): Promise<DinnerRoom[]> {
  const rooms = await prisma.dinnerRoom.findMany({
    where: {
      hostId: actor.userId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
  return rooms.map((room) => mapRoom(room));
}

export async function getRoomBundle(
  roomId: string,
  actors: RequestActors
): Promise<RoomBundle | null> {
  const room = await prisma.dinnerRoom.findUnique({
    where: { id: roomId },
    include: roomBundleInclude
  });
  if (!room) return null;
  if (isOwningHost(actors, room.hostId)) return mapRoomBundle(room, "host");
  if (isRoomGuest(actors, room.id)) return mapRoomBundle(room, "guest");
  return null;
}

export async function getRoomByInviteToken(token: string): Promise<InviteRoomView | null> {
  const room = await prisma.dinnerRoom.findUnique({
    where: { inviteToken: token },
    select: { id: true, title: true, eventType: true, status: true, inviteExpiresAt: true }
  });
  if (!room || (room.inviteExpiresAt && room.inviteExpiresAt <= new Date())) return null;
  return { id: room.id, title: room.title, eventType: room.eventType, status: room.status };
}

export async function getGuestPreferenceContext(actor: GuestActor): Promise<{ guest: Guest; room: DinnerRoom } | null> {
  const guest = await prisma.guest.findUnique({
    where: { id: actor.guestId },
    include: {
      preference: true,
      room: true
    }
  });

  if (!guest || !guest.preference) {
    return null;
  }
  assertGuestBelongsToRoom(actor, guest.roomId);

  return {
    guest: mapGuest(guest),
    room: mapRoom(guest.room, false)
  };
}

export async function getPublicRoom(roomId: string): Promise<PublicRoomView | null> {
  const room = await prisma.dinnerRoom.findFirst({
    where: { id: roomId, isPublicShareable: true, status: "FINALIZED" },
    select: {
      id: true,
      title: true,
      dateTime: true,
      eventType: true,
      location: true,
      totalBudgetCents: true,
      plans: {
        where: { status: "FINALIZED" },
        take: 1,
        select: {
          id: true,
          title: true,
          dishes: {
            select: {
              servings: true,
              contributionGuestId: true,
              contributionReady: true,
              dish: { select: { id: true, name: true, category: true, hotpotRole: true, spiceAdjustable: true, spiceLevel: true } }
            }
          }
        }
      },
      shopping: { select: { ingredient: { select: { category: true } } } }
    }
  });
  if (!room) return null;
  const categories = new Map<PublicRoomView["shoppingCategories"][number]["category"], number>();
  for (const item of room.shopping) categories.set(item.ingredient.category, (categories.get(item.ingredient.category) ?? 0) + 1);
  const plan = room.plans[0];
  return {
    room: {
      id: room.id,
      title: room.title,
      eventType: room.eventType,
      dateTime: room.dateTime?.toISOString(),
      location: room.location ?? undefined,
      totalBudgetCents: room.totalBudgetCents ?? undefined
    },
    finalPlan: plan
      ? {
          id: plan.id,
          title: plan.title,
          contributionSummary: room.eventType === "POTLUCK"
            ? {
                claimedDishes: plan.dishes.filter((item) => item.contributionGuestId).length,
                readyDishes: plan.dishes.filter((item) => item.contributionGuestId && item.contributionReady).length,
                totalDishes: plan.dishes.length
              }
            : undefined,
          preparationNotes: [...new Set([
            ...eventFormats[room.eventType].preparationNotes,
            ...plan.dishes
              .filter(({ dish }) => dish.spiceAdjustable && dish.spiceLevel !== "NONE")
              .map(({ dish }) => `${dish.name}: serve spicy components separately so each guest can adjust the heat.`)
          ])],
          dishes: plan.dishes.map(({ dish, servings }) => ({
            id: dish.id,
            name: dish.name,
            category: dish.category,
            hotpotRole: dish.hotpotRole ?? undefined,
            servings
          }))
        }
      : undefined,
    shoppingCategories: [...categories].map(([category, count]) => ({ category, count }))
  };
}

export async function createRoom(actor: HostActor, input: CreateRoomInput): Promise<DinnerRoom> {
  const room = await prisma.dinnerRoom.create({
    data: {
      hostId: actor.userId,
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

export async function updateRoomDetails(roomId: string, actor: HostActor, input: CreateRoomInput): Promise<DinnerRoom> {
  return prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const current = await tx.dinnerRoom.findUnique({ where: { id: roomId } });
    if (!current) throw new Error("Room not found.");
    assertHostOwnsResource(actor, current.hostId);
    assertWorkflowActionAllowed(current.status, "UPDATE_ROOM_DETAILS");
    const updated = await tx.dinnerRoom.update({
      where: { id: roomId },
      data: {
        title: input.title,
        description: input.description ?? null,
        eventType: input.eventType,
        dateTime: input.dateTime ? new Date(input.dateTime) : null,
        location: input.location ?? null,
        totalBudgetCents: input.totalBudgetCents ?? null,
        expectedGuests: input.expectedGuests,
        isPublicShareable: input.isPublicShareable ?? false,
        status: "COLLECTING_PREFERENCES",
        generationReport: Prisma.DbNull,
        generationAttemptedAt: null
      }
    });
    return mapRoom(updated);
  });
}

export async function joinRoom(input: JoinRoomInput): Promise<Guest & { sessionToken: string }> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "DinnerRoom" WHERE "inviteToken" = ${input.token} FOR UPDATE`);
    const room = await tx.dinnerRoom.findUnique({
      where: { inviteToken: input.token },
      select: { id: true, status: true, inviteExpiresAt: true }
    });
    if (!room || (room.inviteExpiresAt && room.inviteExpiresAt <= new Date())) {
      throw new Error("Invite link is invalid.");
    }
    const existing = await tx.guest.findUnique({
      where: { submissionKey: input.submissionKey },
      include: { preference: true }
    });
    if (existing && existing.roomId !== room.id) {
      throw new AuthorizationError();
    }
    if (existing) {
      const sessionToken = deriveGuestSessionToken(existing.id, input.submissionKey);
      const session = await tx.guestSession.findUnique({ where: { guestId: existing.id } });
      if (
        !session || session.revokedAt || session.expiresAt <= new Date() ||
        session.tokenHash !== hashGuestSessionToken(sessionToken)
      ) {
        throw new Error("This response session has ended. Reopen the invite link to join again.");
      }
      // Recover a lost response without extending, recreating, or unrevoking the
      // existing session, including when voting began after the first submission.
      return { ...mapGuest(existing), sessionToken };
    }
    assertWorkflowActionAllowed(room.status, "JOIN_ROOM");
    const guest = await tx.guest.create({
      data: {
        roomId: room.id,
        submissionKey: input.submissionKey,
        name: input.name,
        email: input.email,
        canBring: input.canBring,
        preference: {
          create: input.preference
        }
      },
      include: {
        preference: true
      }
    });

    const sessionToken = deriveGuestSessionToken(guest.id, input.submissionKey);
    const sessionData = {
      tokenHash: hashGuestSessionToken(sessionToken),
      expiresAt: new Date(Date.now() + GUEST_SESSION_SECONDS * 1000)
    };
    await tx.guestSession.create({
      data: { guestId: guest.id, ...sessionData }
    });

    if (room.status === "PLANNING") {
      await tx.dinnerRoom.update({
        where: { id: room.id },
        data: { status: "COLLECTING_PREFERENCES", generationReport: Prisma.DbNull, generationAttemptedAt: null }
      });
    }
    await tx.activityEvent.create({
      data: {
        roomId: room.id,
        actorName: guest.name,
        type: "GUEST_JOINED",
        message: `${guest.name} submitted preferences.`
      }
    });
    return { ...mapGuest(guest), sessionToken };
  });
}

export async function updateGuestPreferences(
  actor: GuestActor,
  input: Omit<JoinRoomInput, "token" | "submissionKey">
): Promise<Guest> {
  return prisma.$transaction(async (tx) => {
    await lockRoom(tx, actor.roomId);
    const current = await tx.guest.findUnique({
      where: { id: actor.guestId },
      include: {
        preference: true,
        room: { select: { status: true } }
      }
    });
    if (!current || !current.preference) {
      throw new AuthorizationError();
    }
    assertGuestOwnsResource(actor, current.id);
    assertGuestBelongsToRoom(actor, current.roomId);
    assertWorkflowActionAllowed(current.room.status, "UPDATE_PREFERENCES");

    const unchanged =
      current.name === input.name &&
      (current.email ?? undefined) === input.email &&
      current.canBring === input.canBring &&
      current.preference.dietType === input.preference.dietType &&
      current.preference.spiceLevel === input.preference.spiceLevel &&
      current.preference.maxBudgetCents === (input.preference.maxBudgetCents ?? null) &&
      current.preference.notes === (input.preference.notes ?? null) &&
      sameStringList(current.preference.allergies, input.preference.allergies) &&
      sameStringList(current.preference.dislikes, input.preference.dislikes) &&
      sameStringList(current.preference.likes, input.preference.likes);

    if (unchanged) {
      return mapGuest(current);
    }

    const guest = await tx.guest.update({
      where: { id: current.id },
      data: {
        name: input.name,
        email: input.email ?? null,
        canBring: input.canBring,
        preference: {
          update: {
            dietType: input.preference.dietType,
            allergies: input.preference.allergies,
            dislikes: input.preference.dislikes,
            likes: input.preference.likes,
            spiceLevel: input.preference.spiceLevel,
            maxBudgetCents: input.preference.maxBudgetCents ?? null,
            notes: input.preference.notes ?? null
          }
        }
      },
      include: { preference: true }
    });
    if (current.room.status === "PLANNING") {
      await tx.dinnerRoom.update({
        where: { id: guest.roomId },
        data: { status: "COLLECTING_PREFERENCES", generationReport: Prisma.DbNull, generationAttemptedAt: null }
      });
    }
    await tx.activityEvent.create({
      data: {
        roomId: guest.roomId,
        actorName: guest.name,
        type: "PREFERENCE_UPDATED",
        message: `${guest.name} updated preferences.`
      }
    });

    return mapGuest(guest);
  });
}

export async function generatePlansForRoom(
  roomId: string,
  actor: HostActor
): Promise<MenuGenerationResult<MenuPlan>> {
  const dishes = await getDishCatalog();
  if (dishes.length === 0) {
    throw new Error("Dish catalog is empty. Run npm run db:seed.");
  }

  return prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const currentRoom = await tx.dinnerRoom.findUnique({
      where: { id: roomId },
      include: roomBundleInclude
    });
    if (!currentRoom) {
      throw new Error("Room not found.");
    }
    assertHostOwnsResource(actor, currentRoom.hostId);
    assertWorkflowActionAllowed(currentRoom.status, "GENERATE_PLANS");
    const bundle = mapRoomBundle(currentRoom);
    const generation = generateMenuPlans({ room: bundle.room, guests: bundle.guests, dishes });
    if (generation.kind === "no-solution") {
      await tx.menuPlan.deleteMany({
        where: {
          roomId,
          status: {
            not: "FINALIZED"
          }
        }
      });
      await tx.dinnerRoom.update({
        where: {
          id: roomId
        },
        data: {
          status: "PLANNING",
          generationReport: generation.report as unknown as Prisma.InputJsonValue,
          generationAttemptedAt: new Date()
        }
      });
      await tx.activityEvent.create({
        data: {
          roomId,
          actorName: "TableSync",
          type: "PLAN_GENERATION_FAILED",
          message: generation.report.summary,
          metadata: generation.report as unknown as Prisma.InputJsonValue
        }
      });
      return generation;
    }

    const generated = generation.plans;
    const plansWithIds = generated.map((plan) => ({
      id: crypto.randomUUID(),
      plan
    }));

    await tx.menuPlan.deleteMany({
      where: {
        roomId,
        status: {
          not: "FINALIZED"
        }
      }
    });

    await tx.menuPlan.createMany({
      data: plansWithIds.map(({ id, plan }) => ({
        id,
        roomId,
        title: plan.title,
        summary: plan.summary,
        score: plan.score,
        estimatedCostCents: plan.estimatedCostCents,
        warnings: plan.warnings as unknown as Prisma.InputJsonValue
      }))
    });
    await tx.menuPlanDish.createMany({
      data: plansWithIds.flatMap(({ id, plan }) =>
        plan.dishes.map((item) => ({
          planId: id,
          dishId: item.dish.id,
          servings: item.servings
        }))
      )
    });

    await tx.dinnerRoom.update({
      where: {
        id: roomId
      },
      data: {
        status: "VOTING",
        generationReport: Prisma.DbNull,
        generationAttemptedAt: new Date()
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
    const updated = await tx.dinnerRoom.findUniqueOrThrow({ where: { id: roomId }, include: roomBundleInclude });
    return {
      kind: "success",
      plans: updated.plans.filter((plan) => plan.status === "PROPOSED").map(mapPlan)
    };
  });
}

export async function castVote(planId: string, actor: GuestActor, value: VoteValue, reason?: string): Promise<string> {
  const normalizedReason = value === "VETO" ? reason?.trim() || undefined : undefined;
  if (value === "VETO" && !normalizedReason) {
    throw new Error("A veto reason is required.");
  }

  return prisma.$transaction(async (tx) => {
    await lockRoom(tx, actor.roomId);
    const plan = await tx.menuPlan.findUnique({
      where: {
        id: planId
      },
      select: {
        id: true,
        roomId: true,
        title: true,
        room: {
          select: {
            status: true
          }
        }
      }
    });
    const guest = await tx.guest.findUnique({
      where: {
        id: actor.guestId
      },
      select: {
        id: true,
        roomId: true,
        name: true
      }
    });

    if (!plan || !guest || plan.roomId !== guest.roomId) {
      throw new AuthorizationError();
    }
    assertGuestOwnsResource(actor, guest.id);
    assertGuestBelongsToRoom(actor, plan.roomId);
    assertWorkflowActionAllowed(plan.room.status, "CAST_VOTE");

    const existingVote = await tx.vote.findUnique({
      where: {
        planId_guestId: {
          planId,
          guestId: actor.guestId
        }
      }
    });
    if (
      existingVote?.value === value &&
      (existingVote.reason ?? undefined) === normalizedReason
    ) {
      throw new Error("This vote is unchanged.");
    }

    await tx.vote.upsert({
      where: {
        planId_guestId: {
          planId,
          guestId: actor.guestId
        }
      },
      update: {
        value,
        reason: normalizedReason ?? null
      },
      create: {
        planId,
        guestId: actor.guestId,
        value,
        reason: normalizedReason
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
    return plan.roomId;
  });
}

export async function finalizePlan(planId: string, actor: HostActor): Promise<string> {
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

  return prisma.$transaction(async (tx) => {
    await lockRoom(tx, plan.roomId);
    const currentRoom = await tx.dinnerRoom.findUnique({
      where: { id: plan.roomId },
      include: roomBundleInclude
    });
    if (!currentRoom) {
      throw new Error("Room not found.");
    }
    assertHostOwnsResource(actor, currentRoom.hostId);
    assertWorkflowActionAllowed(currentRoom.status, "FINALIZE_PLAN");
    const bundle = mapRoomBundle(currentRoom);
    const selectedPlan = bundle.plans.find((item) => item.id === planId);
    if (!selectedPlan) {
      throw new Error("Plan not found.");
    }
    const shopping = generateShoppingList({ room: bundle.room, guests: bundle.guests, plan: selectedPlan });
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
      data: shopping.map((item, index) => ({
        roomId: bundle.room.id,
        ingredientId: item.ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
        estimatedCostCents: item.estimatedCostCents,
        assignedToGuestId: item.assignedToGuestId,
        sortOrder: index
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
    return bundle.room.id;
  });
}

export async function reopenPreferences(roomId: string, actor: HostActor): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const room = await tx.dinnerRoom.findUnique({
      where: { id: roomId },
      select: { status: true, hostId: true }
    });
    if (!room) {
      throw new Error("Room not found.");
    }
    assertHostOwnsResource(actor, room.hostId);
    assertWorkflowActionAllowed(room.status, "REOPEN_PREFERENCES");

    await tx.menuPlan.deleteMany({ where: { roomId } });
    await tx.shoppingItem.deleteMany({ where: { roomId } });
    await tx.dinnerRoom.update({
      where: { id: roomId },
      data: {
        status: "COLLECTING_PREFERENCES",
        generationReport: Prisma.DbNull,
        generationAttemptedAt: null
      }
    });
    await tx.activityEvent.create({
      data: {
        roomId,
        actorName: "Host",
        type: "PREFERENCES_REOPENED",
        message: "Reopened preferences and removed all generated plans and votes."
      }
    });
  });
}

export async function undoFinalization(roomId: string, actor: HostActor): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const room = await tx.dinnerRoom.findUnique({
      where: { id: roomId },
      select: {
        status: true,
        hostId: true,
        plans: {
          where: { status: "FINALIZED" },
          select: { id: true }
        }
      }
    });
    if (!room) {
      throw new Error("Room not found.");
    }
    assertHostOwnsResource(actor, room.hostId);
    assertWorkflowActionAllowed(room.status, "UNDO_FINALIZATION");
    if (room.plans.length !== 1) {
      throw new Error("The room does not have exactly one finalized plan.");
    }

    await tx.shoppingItem.deleteMany({ where: { roomId } });
    await tx.menuPlanDish.updateMany({
      where: { plan: { roomId } },
      data: { contributionGuestId: null, contributionReady: false }
    });
    await tx.menuPlan.updateMany({
      where: { roomId, status: "FINALIZED" },
      data: { status: "PROPOSED" }
    });
    await tx.dinnerRoom.update({
      where: { id: roomId },
      data: { status: "VOTING" }
    });
    await tx.activityEvent.create({
      data: {
        roomId,
        actorName: "Host",
        type: "FINALIZATION_UNDONE",
        message: "Undid finalization and removed the shopping list, assignments, purchase state, and dish contributions."
      }
    });
  });
}

export async function claimShoppingItem(itemId: string, actors: RequestActors, targetGuestId?: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const reference = await tx.shoppingItem.findUnique({ where: { id: itemId }, select: { roomId: true } });
    if (!reference) throw new AuthorizationError();
    await lockRoom(tx, reference.roomId);
    const item = await tx.shoppingItem.findUnique({
      where: {
        id: itemId
      },
      include: {
        ingredient: true,
        room: {
          select: {
            status: true,
            hostId: true
          }
        }
      }
    });
    if (!item) {
      throw new AuthorizationError();
    }
    assertWorkflowActionAllowed(item.room.status, "UPDATE_SHOPPING");

    const hostCanManage = isOwningHost(actors, item.room.hostId);
    const guestActor = actors.guest && actors.guest.roomId === item.roomId ? actors.guest : undefined;
    if (!hostCanManage && !guestActor) throw new AuthorizationError();

    let desiredGuestId = targetGuestId;
    if (!hostCanManage && guestActor) {
      if (targetGuestId && targetGuestId !== guestActor.guestId) throw new AuthorizationError();
      if (targetGuestId && item.assignedToGuestId && item.assignedToGuestId !== guestActor.guestId) {
        throw new AuthorizationError();
      }
      if (!targetGuestId && item.assignedToGuestId !== guestActor.guestId) throw new AuthorizationError();
      desiredGuestId = targetGuestId ? guestActor.guestId : undefined;
    }

    const guest = desiredGuestId
      ? await tx.guest.findUnique({
          where: {
            id: desiredGuestId
          },
          select: {
            id: true,
            roomId: true,
            name: true
          }
        })
      : null;
    if (desiredGuestId && (!guest || guest.roomId !== item.roomId)) {
      throw new AuthorizationError();
    }
    if (item.assignedToGuestId === (guest?.id ?? null)) {
      throw new Error("This shopping assignment is unchanged.");
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
        actorName: hostCanManage ? actors.host?.name ?? "Host" : guestActor?.name ?? "Guest",
        type: "ITEM_ASSIGNED",
        message: `${item.ingredient.name} was ${guest ? `assigned to ${guest.name}` : "unassigned"}.`
      }
    });
    return item.roomId;
  });
}

export async function toggleShoppingItem(itemId: string, actors: RequestActors, checked: boolean): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const reference = await tx.shoppingItem.findUnique({ where: { id: itemId }, select: { roomId: true } });
    if (!reference) throw new AuthorizationError();
    await lockRoom(tx, reference.roomId);
    const item = await tx.shoppingItem.findUnique({
      where: {
        id: itemId
      },
      include: {
        ingredient: true,
        room: {
          select: {
            status: true,
            hostId: true
          }
        }
      }
    });
    if (!item) {
      throw new AuthorizationError();
    }
    assertWorkflowActionAllowed(item.room.status, "UPDATE_SHOPPING");
    const hostCanManage = isOwningHost(actors, item.room.hostId);
    const guestActor = actors.guest && actors.guest.roomId === item.roomId ? actors.guest : undefined;
    if (!hostCanManage && (!guestActor || item.assignedToGuestId !== guestActor.guestId)) {
      throw new AuthorizationError();
    }
    if (item.checked === checked) {
      throw new Error("This purchased state is unchanged.");
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
        actorName: hostCanManage ? actors.host?.name ?? "Host" : guestActor?.name ?? "Guest",
        type: "ITEM_CHECKED",
        message: `${item.ingredient.name} was marked ${checked ? "purchased" : "not purchased"}.`
      }
    });
    return item.roomId;
  });
}

async function lockedPotluckContribution(
  tx: Prisma.TransactionClient,
  menuPlanDishId: string,
  actors: RequestActors
) {
  const reference = await tx.menuPlanDish.findUnique({
    where: { id: menuPlanDishId },
    select: { plan: { select: { roomId: true } } }
  });
  if (!reference) throw new AuthorizationError();
  await lockRoom(tx, reference.plan.roomId);
  const room = await tx.dinnerRoom.findUnique({
    where: { id: reference.plan.roomId },
    include: roomBundleInclude
  });
  if (!room) throw new AuthorizationError();
  const hostCanManage = isOwningHost(actors, room.hostId);
  const guest = actors.guest?.roomId === room.id
    ? room.guests.find((item) => item.id === actors.guest?.guestId)
    : undefined;
  if (!hostCanManage && !guest) throw new AuthorizationError();
  if (room.eventType !== "POTLUCK" || room.status !== "FINALIZED") {
    throw new Error("Cannot change dish contributions unless a Potluck menu is finalized.");
  }
  const plan = room.plans.find((item) => item.dishes.some((dish) => dish.id === menuPlanDishId));
  const item = plan?.dishes.find((dish) => dish.id === menuPlanDishId);
  if (!plan || !item) throw new AuthorizationError();
  if (plan.status !== "FINALIZED") {
    throw new Error("Cannot change dish contributions on a menu that is not finalized.");
  }
  return { room, plan, item, hostCanManage, guest };
}

export async function assignPotluckContribution(
  menuPlanDishId: string,
  actors: RequestActors,
  targetGuestId?: string,
  confirmShoppingReset = false
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const { room, plan, item, hostCanManage, guest } = await lockedPotluckContribution(tx, menuPlanDishId, actors);
    const desiredGuestId = targetGuestId || undefined;
    if (!hostCanManage) {
      if (desiredGuestId && desiredGuestId !== guest?.id) throw new AuthorizationError();
      if (desiredGuestId && item.contributionGuestId && item.contributionGuestId !== guest?.id) {
        throw new AuthorizationError();
      }
      if (!desiredGuestId && item.contributionGuestId !== guest?.id) throw new AuthorizationError();
    }
    const owner = desiredGuestId ? room.guests.find((person) => person.id === desiredGuestId) : undefined;
    if (desiredGuestId && !owner) throw new AuthorizationError();
    if (owner && !owner.canBring) {
      throw new Error("Cannot assign a dish to a guest who has not volunteered to bring food or groceries.");
    }
    if (item.contributionGuestId === (desiredGuestId ?? null)) {
      throw new Error("This dish contribution is unchanged.");
    }
    const changesGroceries = Boolean(item.contributionGuestId) !== Boolean(desiredGuestId);
    if (changesGroceries && room.shopping.length > 0 && !confirmShoppingReset) {
      throw new Error("Confirm that shared groceries will change: ingredients no longer needed are removed, and increased quantities need a new purchase check. Other shopping progress is kept.");
    }

    await tx.menuPlanDish.update({
      where: { id: menuPlanDishId },
      data: { contributionGuestId: desiredGuestId ?? null, contributionReady: false }
    });
    // Regenerate from the locked snapshot with precisely this ownership change.
    // Portions, plan cost, votes and menu composition are never changed here.
    const updatedPlan = mapPlan(plan);
    const updatedDish = updatedPlan.dishes.find((dish) => dish.id === menuPlanDishId)!;
    updatedDish.contributionGuestId = desiredGuestId;
    updatedDish.contributionReady = false;
    if (changesGroceries) {
      const shopping = generateShoppingList({
        room: mapRoom(room), guests: room.guests.map((person) => mapGuest(person)), plan: updatedPlan
      });
      const reconciled = reconcileShoppingList(room.shopping.map(mapShoppingItem), shopping);
      if (reconciled.removedIds.length > 0) {
        await tx.shoppingItem.deleteMany({ where: { roomId: room.id, id: { in: reconciled.removedIds } } });
      }
      for (const shoppingItem of reconciled.items) {
        const data = {
          quantity: shoppingItem.quantity,
          estimatedCostCents: shoppingItem.estimatedCostCents ?? null,
          assignedToGuestId: shoppingItem.assignedToGuestId ?? null,
          checked: shoppingItem.checked,
          sortOrder: shoppingItem.sortOrder
        };
        if (shoppingItem.id) {
          await tx.shoppingItem.update({ where: { id: shoppingItem.id }, data });
        } else {
          await tx.shoppingItem.create({ data: {
            ...data, roomId: room.id, ingredientId: shoppingItem.ingredient.id, unit: shoppingItem.unit
          } });
        }
      }
    }
    await tx.activityEvent.createMany({
      data: [
        {
          roomId: room.id,
          actorName: hostCanManage ? actors.host?.name ?? "Host" : guest?.name ?? "Guest",
          type: "CONTRIBUTION_ASSIGNED",
          message: `${item.dish.name} (${item.servings} servings) ${owner ? `will be brought by ${owner.name}` : "was returned to shared shopping"}.`
        },
        {
          roomId: room.id,
          actorName: "TableSync",
          type: "SHOPPING_GENERATED",
          message: changesGroceries
            ? "Updated shared groceries for unclaimed dishes. Kept existing assignments and purchase checks; increased quantities need a new purchase check."
            : "Changed the dish contributor without changing shared groceries, assignments, or purchase checks."
        }
      ]
    });
    return room.id;
  });
}

export async function setPotluckContributionReady(
  menuPlanDishId: string,
  actors: RequestActors,
  ready: boolean
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const { room, item, hostCanManage, guest } = await lockedPotluckContribution(tx, menuPlanDishId, actors);
    if (!item.contributionGuestId) throw new Error("Cannot mark an unclaimed dish ready.");
    if (!hostCanManage && item.contributionGuestId !== guest?.id) throw new AuthorizationError();
    if (item.contributionReady === ready) throw new Error("This dish readiness is unchanged.");
    await tx.menuPlanDish.update({
      where: { id: menuPlanDishId },
      data: { contributionReady: ready }
    });
    await tx.activityEvent.create({
      data: {
        roomId: room.id,
        actorName: hostCanManage ? actors.host?.name ?? "Host" : guest?.name ?? "Guest",
        type: "CONTRIBUTION_READY",
        message: `${item.dish.name} was marked ${ready ? "ready to bring" : "not ready"}.`
      }
    });
    return room.id;
  });
}

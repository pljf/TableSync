import type {
  ActivityEvent,
  DinnerRoom,
  EventType,
  Guest,
  MenuPlan,
  Preference,
  ShoppingItem,
  User,
  VoteValue
} from "@/lib/domain";
import { generateMenuPlans } from "@/lib/menu-engine/generate-menu-plans";
import { demoGuests, demoHost, demoRoom, dishCatalog } from "@/lib/seed-data";
import { generateShoppingList } from "@/lib/shopping-engine/generate-shopping-list";

type StoreState = {
  users: User[];
  rooms: DinnerRoom[];
  guests: Guest[];
  plans: MenuPlan[];
  shopping: ShoppingItem[];
  activities: ActivityEvent[];
};

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

function now(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createActivity(roomId: string, actorName: string, type: ActivityEvent["type"], message: string): ActivityEvent {
  return {
    id: createId("activity"),
    roomId,
    actorName,
    type,
    message,
    createdAt: now()
  };
}

function createVotes(planId: string, index: number) {
  const voteValues: VoteValue[] = index === 0 ? ["LIKE", "LIKE", "NEUTRAL", "LIKE", "LIKE", "NEUTRAL"] : ["NEUTRAL", "LIKE", "NEUTRAL", "NEUTRAL", "LIKE", "VETO"];

  return demoGuests.map((guest, voteIndex) => ({
    id: `vote-${planId}-${guest.id}`,
    planId,
    guestId: guest.id,
    value: voteValues[voteIndex] ?? "NEUTRAL",
    reason: voteValues[voteIndex] === "VETO" ? "Not the best fit for my restriction." : undefined,
    createdAt: demoRoom.createdAt,
    updatedAt: demoRoom.createdAt
  }));
}

function createInitialState(): StoreState {
  const generatedPlans = generateMenuPlans({ room: demoRoom, guests: demoGuests, dishes: dishCatalog });
  const plans: MenuPlan[] = generatedPlans.map((plan, index) => {
    const id = `plan-demo-${index + 1}`;
    return {
      ...plan,
      id,
      roomId: demoRoom.id,
      status: index === 0 ? "FINALIZED" : "PROPOSED",
      votes: createVotes(id, index),
      createdAt: demoRoom.createdAt,
      updatedAt: demoRoom.updatedAt
    };
  });
  const finalPlan = plans[0];
  const shopping: ShoppingItem[] = finalPlan
    ? generateShoppingList({ room: demoRoom, guests: demoGuests, plan: finalPlan }).map((item, index) => ({
        ...item,
        id: `shopping-demo-${index + 1}`,
        roomId: demoRoom.id,
        checked: index < 3,
        createdAt: demoRoom.createdAt,
        updatedAt: demoRoom.updatedAt
      }))
    : [];

  return {
    users: [demoHost],
    rooms: [structuredClone(demoRoom)],
    guests: structuredClone(demoGuests),
    plans,
    shopping,
    activities: [
      createActivity(demoRoom.id, "Pat Host", "ROOM_CREATED", "Created Friday Hotpot Night."),
      createActivity(demoRoom.id, "Guests", "GUEST_JOINED", "Six guests submitted preferences."),
      createActivity(demoRoom.id, "TableSync", "PLANS_GENERATED", "Generated three safe menu plans."),
      createActivity(demoRoom.id, "Pat Host", "PLAN_FINALIZED", "Finalized the top scoring plan."),
      createActivity(demoRoom.id, "TableSync", "SHOPPING_GENERATED", "Generated and assigned the shopping list.")
    ]
  };
}

let state: StoreState | null = null;

function getState(): StoreState {
  if (!state) {
    state = createInitialState();
  }

  return state;
}

export function getDemoHost(): User {
  return demoHost;
}

export function listRoomsForHost(hostId: string): DinnerRoom[] {
  return getState().rooms.filter((room) => room.hostId === hostId);
}

export function getRoomBundle(roomId: string) {
  const current = getState();
  const room = current.rooms.find((item) => item.id === roomId);
  if (!room) {
    return null;
  }

  return {
    room,
    guests: current.guests.filter((guest) => guest.roomId === roomId),
    plans: current.plans.filter((plan) => plan.roomId === roomId),
    shopping: current.shopping.filter((item) => item.roomId === roomId),
    activities: current.activities.filter((event) => event.roomId === roomId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

export function getRoomByInviteToken(token: string) {
  const room = getState().rooms.find((item) => item.inviteToken === token);
  return room ? getRoomBundle(room.id) : null;
}

export function getPublicRoom(roomId: string) {
  const bundle = getRoomBundle(roomId);
  if (!bundle || !bundle.room.isPublicShareable || bundle.room.status !== "FINALIZED") {
    return null;
  }

  return bundle;
}

export function createRoom(input: CreateRoomInput): DinnerRoom {
  const current = getState();
  const timestamp = now();
  const room: DinnerRoom = {
    id: createId("room"),
    hostId: input.hostId,
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    dateTime: input.dateTime ? new Date(input.dateTime).toISOString() : undefined,
    location: input.location,
    totalBudgetCents: input.totalBudgetCents,
    expectedGuests: input.expectedGuests,
    status: "COLLECTING_PREFERENCES",
    inviteToken: createId("invite"),
    isPublicShareable: input.isPublicShareable ?? false,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  current.rooms.push(room);
  current.activities.push(createActivity(room.id, "Host", "ROOM_CREATED", `Created ${room.title}.`));
  return room;
}

export function joinRoom(input: JoinRoomInput): Guest {
  const current = getState();
  const room = current.rooms.find((item) => item.inviteToken === input.token);
  if (!room) {
    throw new Error("Invite link is invalid.");
  }

  const timestamp = now();
  const guestId = createId("guest");
  const guest: Guest = {
    id: guestId,
    roomId: room.id,
    name: input.name,
    email: input.email || undefined,
    editToken: createId("edit"),
    isHostGuest: false,
    canBring: input.canBring,
    createdAt: timestamp,
    updatedAt: timestamp,
    preference: {
      ...input.preference,
      id: createId("preference"),
      guestId
    }
  };

  current.guests.push(guest);
  room.status = "COLLECTING_PREFERENCES";
  room.updatedAt = timestamp;
  current.activities.push(createActivity(room.id, guest.name, "GUEST_JOINED", `${guest.name} submitted preferences.`));
  return guest;
}

export function generatePlansForRoom(roomId: string): MenuPlan[] {
  const current = getState();
  const room = current.rooms.find((item) => item.id === roomId);
  if (!room) {
    throw new Error("Room not found.");
  }

  const guests = current.guests.filter((guest) => guest.roomId === roomId);
  const generated = generateMenuPlans({ room, guests, dishes: dishCatalog });
  const timestamp = now();
  const plans = generated.map<MenuPlan>((plan, index) => ({
    ...plan,
    id: createId(`plan-${index + 1}`),
    roomId,
    status: "PROPOSED",
    votes: [],
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  current.plans = current.plans.filter((plan) => plan.roomId !== roomId || plan.status === "FINALIZED").concat(plans);
  room.status = "VOTING";
  room.updatedAt = timestamp;
  current.activities.push(createActivity(roomId, "TableSync", "PLANS_GENERATED", `Generated ${plans.length} menu plans.`));
  return plans;
}

export function castVote(planId: string, guestId: string, value: VoteValue, reason?: string): void {
  const current = getState();
  const plan = current.plans.find((item) => item.id === planId);
  const guest = current.guests.find((item) => item.id === guestId);
  if (!plan || !guest) {
    throw new Error("Plan or guest was not found.");
  }

  const timestamp = now();
  const existing = plan.votes.find((vote) => vote.guestId === guestId);
  if (existing) {
    existing.value = value;
    existing.reason = reason;
    existing.updatedAt = timestamp;
  } else {
    plan.votes.push({
      id: createId("vote"),
      planId,
      guestId,
      value,
      reason,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  plan.updatedAt = timestamp;
  current.activities.push(createActivity(plan.roomId, guest.name, "VOTE_CAST", `${guest.name} voted ${value.toLowerCase()} on ${plan.title}.`));
}

export function finalizePlan(planId: string): void {
  const current = getState();
  const plan = current.plans.find((item) => item.id === planId);
  if (!plan) {
    throw new Error("Plan not found.");
  }

  const room = current.rooms.find((item) => item.id === plan.roomId);
  if (!room) {
    throw new Error("Room not found.");
  }

  const guests = current.guests.filter((guest) => guest.roomId === room.id);
  const timestamp = now();
  current.plans
    .filter((item) => item.roomId === room.id)
    .forEach((item) => {
      item.status = item.id === planId ? "FINALIZED" : "PROPOSED";
      item.updatedAt = timestamp;
    });
  room.status = "FINALIZED";
  room.updatedAt = timestamp;
  current.shopping = current.shopping.filter((item) => item.roomId !== room.id);
  current.shopping.push(
    ...generateShoppingList({ room, guests, plan }).map((item) => ({
      ...item,
      id: createId("shopping"),
      roomId: room.id,
      checked: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }))
  );
  current.activities.push(createActivity(room.id, "Host", "PLAN_FINALIZED", `Finalized ${plan.title}.`));
  current.activities.push(createActivity(room.id, "TableSync", "SHOPPING_GENERATED", "Generated and assigned the shopping list."));
}

export function claimShoppingItem(itemId: string, guestId?: string): void {
  const current = getState();
  const item = current.shopping.find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error("Shopping item not found.");
  }

  const guest = guestId ? current.guests.find((entry) => entry.id === guestId) : undefined;
  item.assignedToGuestId = guest?.id;
  item.updatedAt = now();
  current.activities.push(createActivity(item.roomId, guest?.name ?? "Host", "ITEM_ASSIGNED", `${item.ingredient.name} was ${guest ? `assigned to ${guest.name}` : "unassigned"}.`));
}

export function toggleShoppingItem(itemId: string, checked: boolean): void {
  const current = getState();
  const item = current.shopping.find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error("Shopping item not found.");
  }

  item.checked = checked;
  item.updatedAt = now();
  current.activities.push(createActivity(item.roomId, "Shopper", "ITEM_CHECKED", `${item.ingredient.name} was marked ${checked ? "purchased" : "not purchased"}.`));
}


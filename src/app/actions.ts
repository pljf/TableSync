"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { AuthorizationError, type RequestActors } from "@/lib/authorization";
import { requireGuestActor, setGuestSessionCookie } from "@/lib/guest-session";
import { getRequestActors, requireHostActor } from "@/lib/request-actors";
import { actorRateLimitSubject, enforceRateLimit, RateLimitError, requestNetworkSubject } from "@/lib/rate-limit";
import { recordSecurityAudit } from "@/lib/security-audit";
import {
  castVote,
  claimShoppingItem,
  createRoom,
  finalizePlan,
  generatePlansForRoom,
  joinRoom,
  reopenPreferences,
  toggleShoppingItem,
  undoFinalization,
  updateGuestPreferences
} from "@/lib/store";
import { claimShoppingSchema, createRoomSchema, joinContextSchema, joinRoomSchema, voteSchema } from "@/lib/validations/forms";
import type { MutationState } from "@/lib/mutation-state";

function optionalValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value;
}

function optionalNumberValue(formData: FormData, key: string): string | undefined {
  const value = optionalValue(formData, key);
  return value === undefined ? undefined : value;
}

function parseGuestPreferenceForm(formData: FormData) {
  const parsed = joinRoomSchema.parse({
    name: formData.get("name"),
    email: optionalValue(formData, "email") ?? "",
    dietType: formData.get("dietType"),
    allergies: optionalValue(formData, "allergies"),
    dislikes: optionalValue(formData, "dislikes"),
    likes: optionalValue(formData, "likes"),
    spiceLevel: formData.get("spiceLevel"),
    maxBudgetDollars: optionalNumberValue(formData, "maxBudgetDollars"),
    canBring: formData.has("canBring"),
    notes: optionalValue(formData, "notes")
  });

  return {
    name: parsed.name,
    email: parsed.email || undefined,
    canBring: parsed.canBring ?? false,
    preference: {
      dietType: parsed.dietType,
      allergies: parsed.allergies,
      dislikes: parsed.dislikes,
      likes: parsed.likes,
      spiceLevel: parsed.spiceLevel,
      maxBudgetCents: parsed.maxBudgetDollars ? Math.round(parsed.maxBudgetDollars * 100) : undefined,
      notes: parsed.notes
    }
  };
}

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Check the highlighted information and try again.";
  }
  if (error instanceof Error) {
    const safePrefixes = [
      "A veto reason",
      "Cannot ",
      "Confirm ",
      "Missing ",
      "Plan or guest",
      "Plan not found",
      "Room not found",
      "Shopping item",
      "The room",
      "This ",
      "Too many requests",
      "You do not"
    ];
    if (safePrefixes.some((prefix) => error.message.startsWith(prefix))) {
      return error.message;
    }
  }
  return "We could not save that change. Check your connection and try again.";
}

type MutableAudit = {
  action: string;
  actorType?: "ANONYMOUS" | "HOST" | "GUEST" | "SYSTEM";
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
};

function auditActors(audit: MutableAudit, actors: RequestActors): void {
  if (actors.host) Object.assign(audit, { actorType: "HOST" as const, actorId: actors.host.userId });
  else if (actors.guest) Object.assign(audit, { actorType: "GUEST" as const, actorId: actors.guest.guestId });
}

function auditOutcome(error: unknown): "DENIED" | "ERROR" {
  return error instanceof AuthorizationError || error instanceof RateLimitError || error instanceof ZodError
    ? "DENIED"
    : "ERROR";
}

async function performMutation(
  message: string,
  audit: MutableAudit,
  mutation: (audit: MutableAudit) => Promise<void>
): Promise<MutationState> {
  try {
    await mutation(audit);
    await recordSecurityAudit({ ...audit, outcome: "ALLOWED" });
    return { status: "success", message, mutationId: crypto.randomUUID() };
  } catch (error) {
    await recordSecurityAudit({ ...audit, outcome: auditOutcome(error) });
    return { status: "error", message: mutationErrorMessage(error), mutationId: crypto.randomUUID() };
  }
}

export async function createRoomAction(formData: FormData) {
  const host = await requireHostActor();
  await enforceRateLimit({ scope: "create-room", subject: `host:${host.userId}`, limit: 20, windowSeconds: 60 });
  const parsed = createRoomSchema.parse({
    title: formData.get("title"),
    description: optionalValue(formData, "description"),
    eventType: formData.get("eventType"),
    dateTime: optionalValue(formData, "dateTime"),
    location: optionalValue(formData, "location"),
    totalBudgetDollars: optionalNumberValue(formData, "totalBudgetDollars"),
    expectedGuests: formData.get("expectedGuests"),
    isPublicShareable: formData.has("isPublicShareable")
  });

  const room = await createRoom(host, {
    title: parsed.title,
    description: parsed.description,
    eventType: parsed.eventType,
    dateTime: parsed.dateTime,
    location: parsed.location,
    totalBudgetCents: parsed.totalBudgetDollars ? Math.round(parsed.totalBudgetDollars * 100) : undefined,
    expectedGuests: parsed.expectedGuests,
    isPublicShareable: parsed.isPublicShareable
  });
  await recordSecurityAudit({
    action: "create-room",
    actorType: "HOST",
    actorId: host.userId,
    outcome: "ALLOWED",
    resourceType: "room",
    resourceId: room.id
  });

  revalidatePath("/dashboard");
  redirect(`/rooms/${room.id}`);
}

export async function joinRoomAction(
  token: string,
  submissionKey: string,
  _previousState: MutationState,
  formData: FormData
): Promise<MutationState> {
  void _previousState;
  try {
    const context = joinContextSchema.parse({ token, submissionKey });
    await enforceRateLimit({
      scope: "join-room",
      subject: `${await requestNetworkSubject()}:invite:${context.token}`,
      limit: 20,
      windowSeconds: 600
    });
    const input = parseGuestPreferenceForm(formData);
    const guest = await joinRoom({
      token: context.token,
      submissionKey: context.submissionKey,
      ...input
    });
    await setGuestSessionCookie(guest.sessionToken);
    await recordSecurityAudit({
      action: "join-room",
      actorType: "GUEST",
      actorId: guest.id,
      outcome: "ALLOWED",
      resourceType: "room",
      resourceId: guest.roomId
    });

    return {
      status: "success",
      message: "Preferences saved.",
      mutationId: crypto.randomUUID(),
      redirectTo: "/preferences?saved=1"
    };
  } catch (error) {
    await recordSecurityAudit({
      action: "join-room",
      outcome: auditOutcome(error),
      resourceType: "invite",
      resourceId: token
    });
    return { status: "error", message: mutationErrorMessage(error), mutationId: crypto.randomUUID() };
  }
}

export async function updateGuestPreferencesAction(
  _previousState: MutationState,
  formData: FormData
): Promise<MutationState> {
  void _previousState;
  return performMutation("Preferences saved.", { action: "update-guest-preferences" }, async (audit) => {
    const guest = await requireGuestActor();
    Object.assign(audit, {
      actorType: "GUEST" as const,
      actorId: guest.guestId,
      resourceType: "guest",
      resourceId: guest.guestId
    });
    await enforceRateLimit({ scope: "guest-preferences", subject: `guest:${guest.guestId}`, limit: 30, windowSeconds: 60 });
    await updateGuestPreferences(guest, parseGuestPreferenceForm(formData));
  });
}

export async function generatePlansAction(
  roomId: string,
  _previousState: MutationState,
  _formData: FormData
): Promise<MutationState> {
  void _previousState;
  void _formData;
  return performMutation(
    "Safe menu plans are ready for voting.",
    { action: "generate-plans", resourceType: "room", resourceId: roomId },
    async (audit) => {
    const host = await requireHostActor();
    Object.assign(audit, { actorType: "HOST" as const, actorId: host.userId });
    await enforceRateLimit({ scope: "generate-plans", subject: `host:${host.userId}`, limit: 10, windowSeconds: 60 });
    await generatePlansForRoom(roomId, host);
    }
  );
}

export async function reopenPreferencesAction(
  roomId: string,
  _previousState: MutationState,
  formData: FormData
): Promise<MutationState> {
  return performMutation(
    "Preference collection reopened.",
    { action: "reopen-preferences", resourceType: "room", resourceId: roomId },
    async (audit) => {
    const host = await requireHostActor();
    Object.assign(audit, { actorType: "HOST" as const, actorId: host.userId });
    await enforceRateLimit({ scope: "reopen-preferences", subject: `host:${host.userId}`, limit: 10, windowSeconds: 60 });
    if (formData.get("confirmDataLoss") !== "on") {
      throw new Error("Confirm that generated plans and votes will be removed.");
    }
    await reopenPreferences(roomId, host);
    }
  );
}

export async function undoFinalizationAction(
  roomId: string,
  _previousState: MutationState,
  formData: FormData
): Promise<MutationState> {
  return performMutation(
    "Finalization undone; voting is open again.",
    { action: "undo-finalization", resourceType: "room", resourceId: roomId },
    async (audit) => {
    const host = await requireHostActor();
    Object.assign(audit, { actorType: "HOST" as const, actorId: host.userId });
    await enforceRateLimit({ scope: "undo-finalization", subject: `host:${host.userId}`, limit: 10, windowSeconds: 60 });
    if (formData.get("confirmDataLoss") !== "on") {
      throw new Error("Confirm that shopping assignments and purchase state will be removed.");
    }
    await undoFinalization(roomId, host);
    }
  );
}

export async function castVoteAction(
  _previousState: MutationState,
  formData: FormData
): Promise<MutationState> {
  return performMutation("Vote saved.", { action: "cast-vote" }, async (audit) => {
    const parsed = voteSchema.parse({
      planId: formData.get("planId"),
      value: formData.get("value"),
      reason: optionalValue(formData, "reason")
    });

    const guest = await requireGuestActor();
    Object.assign(audit, {
      actorType: "GUEST" as const,
      actorId: guest.guestId,
      resourceType: "plan",
      resourceId: parsed.planId
    });
    await enforceRateLimit({ scope: "cast-vote", subject: `guest:${guest.guestId}`, limit: 60, windowSeconds: 60 });
    await castVote(parsed.planId, guest, parsed.value, parsed.reason);
  });
}

export async function finalizePlanAction(
  planId: string,
  _previousState: MutationState,
  _formData: FormData
): Promise<MutationState> {
  void _previousState;
  void _formData;
  return performMutation(
    "Plan finalized and shopping list generated.",
    { action: "finalize-plan", resourceType: "plan", resourceId: planId },
    async (audit) => {
    const host = await requireHostActor();
    Object.assign(audit, { actorType: "HOST" as const, actorId: host.userId });
    await enforceRateLimit({ scope: "finalize-plan", subject: `host:${host.userId}`, limit: 10, windowSeconds: 60 });
    await finalizePlan(planId, host);
    }
  );
}

export async function claimShoppingAction(
  _previousState: MutationState,
  formData: FormData
): Promise<MutationState> {
  return performMutation("Assignment saved.", { action: "claim-shopping" }, async (audit) => {
    const parsed = claimShoppingSchema.parse({
      itemId: formData.get("itemId"),
      guestId: optionalValue(formData, "guestId")
    });
    const actors = await getRequestActors();
    auditActors(audit, actors);
    Object.assign(audit, { resourceType: "shopping-item", resourceId: parsed.itemId });
    const subject = actorRateLimitSubject(actors) === "anonymous" ? await requestNetworkSubject() : actorRateLimitSubject(actors);
    await enforceRateLimit({ scope: "claim-shopping", subject, limit: 60, windowSeconds: 60 });
    await claimShoppingItem(parsed.itemId, actors, parsed.guestId);
  });
}

export async function toggleShoppingAction(
  _previousState: MutationState,
  formData: FormData
): Promise<MutationState> {
  return performMutation("Purchased state saved.", { action: "toggle-shopping" }, async (audit) => {
    const itemId = formData.get("itemId");
    if (typeof itemId !== "string") {
      throw new Error("Missing shopping item.");
    }
    const actors = await getRequestActors();
    auditActors(audit, actors);
    Object.assign(audit, { resourceType: "shopping-item", resourceId: itemId });
    const subject = actorRateLimitSubject(actors) === "anonymous" ? await requestNetworkSubject() : actorRateLimitSubject(actors);
    await enforceRateLimit({ scope: "toggle-shopping", subject, limit: 60, windowSeconds: 60 });
    await toggleShoppingItem(itemId, actors, formData.has("checked"));
  });
}


"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearHostSession, requireHost, setDemoHostSession } from "@/lib/auth";
import { castVote, claimShoppingItem, createRoom, finalizePlan, generatePlansForRoom, joinRoom, toggleShoppingItem } from "@/lib/store";
import { claimShoppingSchema, createRoomSchema, joinRoomSchema, voteSchema } from "@/lib/validations/forms";

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

export async function signInDemoHostAction() {
  await setDemoHostSession();
  redirect("/dashboard");
}

export async function signOutAction() {
  await clearHostSession();
  redirect("/");
}

export async function createRoomAction(formData: FormData) {
  const host = await requireHost();
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

  const room = await createRoom({
    hostId: host.id,
    title: parsed.title,
    description: parsed.description,
    eventType: parsed.eventType,
    dateTime: parsed.dateTime,
    location: parsed.location,
    totalBudgetCents: parsed.totalBudgetDollars ? Math.round(parsed.totalBudgetDollars * 100) : undefined,
    expectedGuests: parsed.expectedGuests,
    isPublicShareable: parsed.isPublicShareable
  });

  revalidatePath("/dashboard");
  redirect(`/rooms/${room.id}`);
}

export async function joinRoomAction(token: string, formData: FormData) {
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

  const guest = await joinRoom({
    token,
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
  });

  revalidatePath(`/rooms/${guest.roomId}`);
  redirect(`/rooms/${guest.roomId}`);
}

export async function generatePlansAction(roomId: string) {
  await requireHost();
  await generatePlansForRoom(roomId);
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath(`/rooms/${roomId}/plans`);
}

export async function castVoteAction(formData: FormData) {
  const parsed = voteSchema.parse({
    planId: formData.get("planId"),
    guestId: formData.get("guestId"),
    value: formData.get("value"),
    reason: optionalValue(formData, "reason")
  });

  await castVote(parsed.planId, parsed.guestId, parsed.value, parsed.reason);
  revalidatePath("/");
}

export async function finalizePlanAction(planId: string) {
  await requireHost();
  await finalizePlan(planId);
  revalidatePath("/");
}

export async function claimShoppingAction(formData: FormData) {
  const parsed = claimShoppingSchema.parse({
    itemId: formData.get("itemId"),
    guestId: optionalValue(formData, "guestId")
  });
  await claimShoppingItem(parsed.itemId, parsed.guestId);
  revalidatePath("/");
}

export async function toggleShoppingAction(formData: FormData) {
  const itemId = formData.get("itemId");
  if (typeof itemId !== "string") {
    throw new Error("Missing shopping item.");
  }

  await toggleShoppingItem(itemId, formData.has("checked"));
  revalidatePath("/");
}


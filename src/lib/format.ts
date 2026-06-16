import type { ActivityType, DietType, EventType, RoomStatus, SpiceLevel, VoteValue } from "@/lib/domain";

export function formatMoney(cents?: number): string {
  if (typeof cents !== "number") {
    return "Not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100);
}

export function formatDate(value?: string): string {
  if (!value) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusTone(status: RoomStatus): "neutral" | "info" | "success" | "warning" {
  if (status === "FINALIZED") {
    return "success";
  }
  if (status === "VOTING" || status === "PLANNING") {
    return "warning";
  }
  if (status === "COLLECTING_PREFERENCES") {
    return "info";
  }
  return "neutral";
}

export const eventTypeLabels: Record<EventType, string> = {
  DINNER: "Dinner",
  POTLUCK: "Potluck",
  HOTPOT: "Hotpot",
  BBQ: "BBQ",
  PICNIC: "Picnic",
  BRUNCH: "Brunch",
  OTHER: "Other"
};

export const dietLabels: Record<DietType, string> = {
  OMNIVORE: "Omnivore",
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  PESCATARIAN: "Pescatarian",
  HALAL: "Halal",
  KOSHER: "Kosher",
  GLUTEN_FREE: "Gluten-free"
};

export const spiceLabels: Record<SpiceLevel, string> = {
  NONE: "No spice",
  MILD: "Mild",
  MEDIUM: "Medium",
  HOT: "Hot"
};

export const voteLabels: Record<VoteValue, string> = {
  LIKE: "Like",
  NEUTRAL: "Neutral",
  VETO: "Veto"
};

export const activityLabels: Record<ActivityType, string> = {
  ROOM_CREATED: "Room created",
  GUEST_JOINED: "Guest joined",
  PREFERENCE_UPDATED: "Preference updated",
  PLANS_GENERATED: "Plans generated",
  VOTE_CAST: "Vote cast",
  PLAN_FINALIZED: "Plan finalized",
  SHOPPING_GENERATED: "Shopping generated",
  ITEM_ASSIGNED: "Item assigned",
  ITEM_CHECKED: "Item checked"
};


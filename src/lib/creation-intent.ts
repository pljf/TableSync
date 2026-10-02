import type { EventType } from "@/lib/domain";

const eventTypes: EventType[] = ["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"];

// Reject duplicate query values; only one known occasion is a creation intent.
export function creationEventType(value: string | string[] | undefined): EventType | undefined {
  return typeof value === "string" && eventTypes.includes(value as EventType) ? value as EventType : undefined;
}

export function creationHref(eventType?: EventType): string {
  return eventType ? "/rooms/new?eventType=" + eventType : "/rooms/new";
}

export function creationAuthHref(eventType?: EventType, error = false): string {
  const query = new URLSearchParams({ create: "1" });
  if (eventType) query.set("eventType", eventType);
  if (error) query.set("error", "provider");
  return "/auth?" + query;
}

export function signInCreationIntent(query: { create?: string | string[]; eventType?: string | string[] }) {
  const creating = query.create === "1";
  const eventType = creationEventType(query.eventType);
  return {
    destination: creating ? creationHref(eventType) : "/dashboard",
    errorDestination: creating ? creationAuthHref(eventType, true) : "/auth?error=provider"
  };
}

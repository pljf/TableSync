import { getCurrentUser, requireHost } from "@/lib/auth";
import { hostActorFromUser, type HostActor, type RequestActors } from "@/lib/authorization";
import { getCurrentGuestActor } from "@/lib/guest-session";

export async function getRequestActors(roomId?: string): Promise<RequestActors> {
  const [user, guest] = await Promise.all([getCurrentUser(), getCurrentGuestActor(roomId)]);
  return { host: user ? hostActorFromUser(user) : undefined, guest: guest ?? undefined };
}

export async function requireHostActor(): Promise<HostActor> {
  return hostActorFromUser(await requireHost());
}

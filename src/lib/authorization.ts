import type { User } from "@/lib/domain";

export type HostActor = {
  kind: "host";
  userId: string;
  name: string;
  email: string;
};

export type GuestActor = {
  kind: "guest";
  guestId: string;
  roomId: string;
  name: string;
};

export type RequestActors = {
  host?: HostActor;
  guest?: GuestActor;
};

export class AuthorizationError extends Error {
  constructor() {
    super("You do not have access to this resource.");
    this.name = "AuthorizationError";
  }
}

export function hostActorFromUser(user: User): HostActor {
  return { kind: "host", userId: user.id, name: user.name, email: user.email };
}

export function assertHostOwnsResource(actor: HostActor, resourceHostId: string): void {
  if (actor.userId !== resourceHostId) {
    throw new AuthorizationError();
  }
}

export function assertGuestOwnsResource(actor: GuestActor, resourceGuestId: string): void {
  if (actor.guestId !== resourceGuestId) {
    throw new AuthorizationError();
  }
}

export function assertGuestBelongsToRoom(actor: GuestActor, roomId: string): void {
  if (actor.roomId !== roomId) {
    throw new AuthorizationError();
  }
}

export function isOwningHost(actors: RequestActors, hostId: string): boolean {
  return actors.host?.userId === hostId;
}

export function isRoomGuest(actors: RequestActors, roomId: string): boolean {
  return actors.guest?.roomId === roomId;
}

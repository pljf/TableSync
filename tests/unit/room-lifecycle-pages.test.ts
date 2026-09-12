import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DinnerRoom, RoomStatus } from "@/lib/domain";

const mocks = vi.hoisted(() => ({ actors: vi.fn(), host: vi.fn(), bundle: vi.fn(), rooms: vi.fn() }));
vi.mock("@/app/actions", () => ({ deleteRoomAction: vi.fn() }));
vi.mock("@/lib/request-actors", () => ({ getRequestActors: mocks.actors }));
vi.mock("@/lib/auth", () => ({ requireHost: mocks.host }));
vi.mock("@/lib/room-revision", () => ({ getRoomRevision: vi.fn().mockResolvedValue("revision") }));
vi.mock("@/lib/store", () => ({ getRoomBundle: mocks.bundle, listRoomsForHost: mocks.rooms }));
vi.mock("@/components/rooms/room-sync", () => ({ RoomSync: () => null }));
vi.mock("@/components/ui/mutation-form", () => ({ MutationForm: ({ children }: { children: ReactNode }) => createElement("form", null, children) }));

import RoomPage from "@/app/rooms/[roomId]/page";
import DashboardPage from "@/app/dashboard/page";

const room: DinnerRoom = {
  id: "room-1", hostId: "host-1", title: "Friday dinner", eventType: "DINNER", status: "COLLECTING_PREFERENCES",
  dateTime: "2026-09-20T17:00:00.000Z", isPublicShareable: false,
  createdAt: "2026-09-10T15:30:00.000Z", updatedAt: "2026-09-12T10:00:00.000Z"
};
const policy = "Rooms expire 7 days after creation and are automatically deleted.";

function useRoom(status: RoomStatus = "COLLECTING_PREFERENCES") {
  mocks.bundle.mockResolvedValue({ room: { ...room, status }, plans: [], guests: [], shopping: [], activities: [] });
}

describe("room lifetime and deletion UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actors.mockResolvedValue({ host: { userId: room.hostId } });
    mocks.host.mockResolvedValue({ id: room.hostId, name: "Maya", email: "maya@example.com", isAnonymous: false });
    mocks.rooms.mockResolvedValue([room]);
    useRoom();
  });

  it.each(["DRAFT", "COLLECTING_PREFERENCES", "PLANNING", "VOTING", "FINALIZED", "ARCHIVED"] as RoomStatus[])("lets the creator delete a room in %s with an explicit data-loss confirmation", async (status) => {
    useRoom(status);
    const html = renderToStaticMarkup(await RoomPage({ params: Promise.resolve({ roomId: room.id }) }));

    expect(html).toContain('<summary>Delete room</summary>');
    const confirmation = html.match(/<input\b[^>]*\bname="confirmDataLoss"[^>]*>/)?.[0];
    expect(confirmation).toContain('type="checkbox"');
    expect(confirmation).toContain('required=""');
    expect(html).toContain("Delete room permanently");
    expect(html).toContain("This cannot be undone.");
    expect(html).toContain("Invite and share links will stop working.");
    expect(html).toContain(policy);
    expect(html).toContain('dateTime="2026-09-17T15:30:00.000Z"');
  });

  it.each([
    { guest: { roomId: room.id, guestId: "guest-1", name: "Sam" } },
    { host: { userId: "another-host" }, guest: { roomId: room.id, guestId: "guest-1", name: "Sam" } }
  ])("shows expiry but no deletion control for a participant who does not own the room", async (actors) => {
    mocks.actors.mockResolvedValue(actors);
    const html = renderToStaticMarkup(await RoomPage({ params: Promise.resolve({ roomId: room.id }) }));

    expect(html).not.toContain("Delete room");
    expect(html).not.toContain('name="confirmDataLoss"');
    expect(html).toContain(policy);
  });

  it("shows each dashboard room's creation-based expiry and confirms deletion", async () => {
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({ deleted: "1" }) }));

    expect(html).toContain(policy);
    expect(html).toContain('dateTime="2026-09-17T15:30:00.000Z"');
    expect(html).toContain('role="status">Room deleted.');
  });

  it("makes account-linked rooms' expiry clear after saving across devices", async () => {
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({ saved: "1" }) }));

    expect(html).toContain("return from another device until the rooms expire");
    expect(html).toContain(policy);
    expect(html).not.toContain("Room deleted.");
  });
});

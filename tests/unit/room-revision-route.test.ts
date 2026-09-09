import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({ actors: vi.fn(), revision: vi.fn() }));
vi.mock("@/lib/request-actors", () => ({ getRequestActors: boundary.actors }));
vi.mock("@/lib/room-revision", () => ({ getRoomRevision: boundary.revision }));

import { GET } from "@/app/api/rooms/[roomId]/revision/route";

function read() {
  return GET(new Request("https://tablesync.test/api/rooms/room-1/revision"), { params: Promise.resolve({ roomId: "room-1" }) });
}

describe("room revision endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    boundary.actors.mockResolvedValue({ guest: { roomId: "room-1" } });
  });
  afterEach(() => vi.restoreAllMocks());

  it("resolves room-scoped identity and returns only an uncached revision", async () => {
    boundary.revision.mockResolvedValue("a".repeat(64));
    const response = await read();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(await response.json()).toEqual({ revision: "a".repeat(64) });
    expect(boundary.actors).toHaveBeenCalledExactlyOnceWith("room-1");
    expect(boundary.revision).toHaveBeenCalledExactlyOnceWith("room-1", { guest: { roomId: "room-1" } });
  });

  it("does not distinguish inaccessible and missing rooms", async () => {
    boundary.revision.mockResolvedValue(null);
    const response = await read();
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Room unavailable" });
  });

  it("lets the client retry a temporary failure without exposing its details", async () => {
    boundary.actors.mockRejectedValue(new Error("private database details"));
    const response = await read();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain("private database details");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("room_revision_failed", "UNKNOWN");
  });

  it.each(["P2028", "08P01", "ECONNRESET"])("logs only the recognized failure code %s", async (code) => {
    boundary.revision.mockRejectedValue({ code, message: "private message", stack: "private stack", meta: { token: "private token" } });
    const response = await read();
    expect(response.status).toBe(503);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("room_revision_failed", code);
    expect(await response.text()).not.toContain("private");
  });

  it("does not echo an arbitrary code that contains sensitive data", async () => {
    boundary.revision.mockRejectedValue({ code: "connection failed; password=private-fixture", message: "private details" });
    const response = await read();
    expect(response.status).toBe(503);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("room_revision_failed", "UNKNOWN");
  });
});

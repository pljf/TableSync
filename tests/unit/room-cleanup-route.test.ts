import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cleanup = vi.hoisted(() => ({ purgeExpiredRooms: vi.fn() }));
vi.mock("@/lib/room-cleanup", () => cleanup);

import { GET } from "@/app/api/cron/rooms/route";

const secret = "room-cleanup-test-secret-at-least-32-characters";

function request(authorization?: string) {
  return new Request("https://tablesync.test/api/cron/rooms", {
    headers: authorization === undefined ? {} : { authorization }
  });
}

describe("scheduled room cleanup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", secret);
    cleanup.purgeExpiredRooms.mockResolvedValue({ count: 3 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([undefined, "", "Bearer wrong", `Basic ${secret}`, `Bearer ${secret.slice(0, -1)}x`])(
    "rejects missing or invalid credentials without touching rooms: %s",
    async (authorization) => {
      const response = await GET(request(authorization));

      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toContain("no-store");
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
      expect(cleanup.purgeExpiredRooms).not.toHaveBeenCalled();
    }
  );

  it.each([undefined, "", "   "])("fails closed when CRON_SECRET is absent or blank: %s", async (value) => {
    vi.stubEnv("CRON_SECRET", value);

    const response = await GET(request(`Bearer ${value}`));

    expect(response.status).toBe(401);
    expect(cleanup.purgeExpiredRooms).not.toHaveBeenCalled();
  });

  it("compares byte lengths before timingSafeEqual even for multibyte input", async () => {
    vi.stubEnv("CRON_SECRET", "abc");
    const response = await GET(request("Bearer abé"));

    expect(response.status).toBe(401);
    expect(cleanup.purgeExpiredRooms).not.toHaveBeenCalled();
  });

  it("purges expired rooms with the valid scheduler secret and returns only the count", async () => {
    const response = await GET(request(`Bearer ${secret}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ deletedRooms: 3 });
    expect(cleanup.purgeExpiredRooms).toHaveBeenCalledExactlyOnceWith();
  });

  it("does not allow query parameters to change the retention cutoff", async () => {
    const response = await GET(new Request(
      "https://tablesync.test/api/cron/rooms?now=2099-01-01&days=0",
      { headers: { authorization: `Bearer ${secret}` } }
    ));

    expect(response.status).toBe(200);
    expect(cleanup.purgeExpiredRooms).toHaveBeenCalledExactlyOnceWith();
  });

  it("reports failure without disclosing the secret or database details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    cleanup.purgeExpiredRooms.mockRejectedValue(new Error(`private-database-error ${secret}`));

    const response = await GET(request(`Bearer ${secret}`));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toBe(JSON.stringify({ error: "Room cleanup failed." }));
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("private-database-error");
  });
});

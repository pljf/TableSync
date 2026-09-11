import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ deleteMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { dinnerRoom: { deleteMany: database.deleteMany } } }));

import { purgeExpiredRooms } from "@/lib/room-cleanup";

describe("expired room database cleanup", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.useRealTimers());

  it("includes the exact seven-day boundary when deleting expired rooms", async () => {
    database.deleteMany.mockResolvedValue({ count: 4 });

    await expect(purgeExpiredRooms(new Date("2026-09-11T05:00:00.000Z"))).resolves.toEqual({ count: 4 });
    expect(database.deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { createdAt: { lte: new Date("2026-09-04T05:00:00.000Z") } }
    });
  });

  it("uses the execution time by default and tolerates an empty repeat cleanup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T05:59:59.123Z"));
    database.deleteMany.mockResolvedValue({ count: 0 });

    await expect(purgeExpiredRooms()).resolves.toEqual({ count: 0 });
    expect(database.deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { createdAt: { lte: new Date("2026-09-04T05:59:59.123Z") } }
    });
  });

  it("propagates database failures so the scheduler can report them", async () => {
    database.deleteMany.mockRejectedValue(new Error("cleanup unavailable"));

    await expect(purgeExpiredRooms()).rejects.toThrow("cleanup unavailable");
  });
});

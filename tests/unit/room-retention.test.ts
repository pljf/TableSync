import { describe, expect, it } from "vitest";
import { activeRoomWhere, expiredRoomCutoff, roomExpiresAt } from "@/lib/room-retention";

describe("seven-day room lifetime", () => {
  it.each([
    ["2026-09-10T23:30:00.000Z", "2026-09-17T23:30:00.000Z"],
    ["2026-12-28T12:00:00.000Z", "2027-01-04T12:00:00.000Z"],
    ["2026-03-07T12:00:00-05:00", "2026-03-14T17:00:00.000Z"]
  ])("expires %s exactly 168 hours later regardless of calendar or DST", (createdAt, expiresAt) => {
    expect(roomExpiresAt(createdAt).toISOString()).toBe(expiresAt);
    expect(roomExpiresAt(new Date(createdAt)).toISOString()).toBe(expiresAt);
  });

  it("excludes rooms at the exact seven-day boundary without extending their creation date", () => {
    const now = new Date("2026-09-17T23:30:00.000Z");
    const cutoff = expiredRoomCutoff(now);
    expect(cutoff.toISOString()).toBe("2026-09-10T23:30:00.000Z");
    expect(activeRoomWhere(now)).toEqual({ createdAt: { gt: cutoff } });
    expect(now.toISOString()).toBe("2026-09-17T23:30:00.000Z");
  });
});

import { describe, expect, it } from "vitest";
import { activeRoomWhere, expiredRoomCutoff, expiredRoomWhere, roomExpiresAt } from "@/lib/room-retention";

describe("event-aware room lifetime", () => {
  it.each([
    ["2026-09-10T23:30:00.000Z", "2026-09-17T23:30:00.000Z"],
    ["2026-12-28T12:00:00.000Z", "2027-01-04T12:00:00.000Z"],
    ["2026-03-07T12:00:00-05:00", "2026-03-14T17:00:00.000Z"]
  ])("expires %s exactly 168 hours later regardless of calendar or DST", (createdAt, expiresAt) => {
    expect(roomExpiresAt(createdAt).toISOString()).toBe(expiresAt);
    expect(roomExpiresAt(new Date(createdAt)).toISOString()).toBe(expiresAt);
  });

  it.each([
    ["2026-09-24T18:30:00.000Z", "2026-09-27T18:30:00.000Z"],
    ["2026-09-11T18:30:00.000Z", "2026-09-17T23:30:00.000Z"],
    ["2026-09-01T18:30:00.000Z", "2026-09-17T23:30:00.000Z"]
  ])("retains a gathering at %s through the later event or creation boundary", (dateTime, expiresAt) => {
    expect(roomExpiresAt("2026-09-10T23:30:00.000Z", dateTime).toISOString()).toBe(expiresAt);
  });

  it("keeps a full 72-hour grace across daylight saving time", () => {
    expect(roomExpiresAt("2026-03-01T12:00:00-05:00", new Date("2026-03-07T12:00:00-05:00")).toISOString()).toBe("2026-03-10T17:00:00.000Z");
  });

  it("excludes rooms at the exact seven-day boundary without extending their creation date", () => {
    const now = new Date("2026-09-17T23:30:00.000Z");
    const cutoff = expiredRoomCutoff(now);
    expect(cutoff.toISOString()).toBe("2026-09-10T23:30:00.000Z");
    const eventCutoff = new Date("2026-09-14T23:30:00.000Z");
    expect(activeRoomWhere(now)).toEqual({ AND: [{ OR: [{ createdAt: { gt: cutoff } }, { dateTime: { gt: eventCutoff } }] }] });
    expect(expiredRoomWhere(now)).toEqual({ AND: [{ createdAt: { lte: cutoff } }, { OR: [{ dateTime: null }, { dateTime: { lte: eventCutoff } }] }] });
    const access = [{ hostId: "owning-host" }];
    expect({ OR: access, ...activeRoomWhere(now) }.OR).toBe(access);
    expect(now.toISOString()).toBe("2026-09-17T23:30:00.000Z");
  });
});

import { describe, expect, it } from "vitest";
import { formatEventDateTime, roomDateTimeToIso } from "@/lib/date-time";

describe("event time zones", () => {
  it("stores the selected local time independently of the server time zone", () => {
    expect(roomDateTimeToIso("2026-09-11T19:30", "240")).toBe("2026-09-11T23:30:00.000Z");
    expect(roomDateTimeToIso("2026-09-11T19:30", "-330")).toBe("2026-09-11T14:00:00.000Z");
    expect(roomDateTimeToIso("2026-12-11T19:30", "300")).toBe("2026-12-12T00:30:00.000Z");
  });

  it("keeps explicit instants and optional dates while rejecting missing or invalid offsets", () => {
    expect(roomDateTimeToIso(undefined, null)).toBeUndefined();
    expect(roomDateTimeToIso("2026-09-11T19:30:00-04:00", null)).toBe("2026-09-11T23:30:00.000Z");
    for (const offset of [null, "", "invalid", "900", "1.5"]) {
      expect(() => roomDateTimeToIso("2026-09-11T19:30", offset)).toThrow("Cannot determine your time zone");
    }
  });

  it("shows the instant in the viewer's zone with an explicit zone label", () => {
    expect(formatEventDateTime("2026-09-11T23:30:00.000Z", "America/New_York")).toContain("7:30 PM EDT");
    expect(formatEventDateTime("2026-09-11T23:30:00.000Z", "UTC")).toContain("11:30 PM UTC");
  });
});

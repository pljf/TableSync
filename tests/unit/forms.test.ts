import { describe, expect, it } from "vitest";
import { createRoomSchema, joinRoomSchema } from "@/lib/validations/forms";

describe("room form validation", () => {
  const validRoom = {
    title: "Friday dinner",
    eventType: "DINNER",
    expectedGuests: 6
  } as const;

  it.each(["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"])("accepts the %s gathering format", (eventType) => {
    expect(createRoomSchema.parse({ ...validRoom, eventType }).eventType).toBe(eventType);
  });

  it("rejects unknown event formats", () => {
    expect(createRoomSchema.safeParse({ ...validRoom, eventType: "UNKNOWN" }).success).toBe(false);
  });

  it("accepts a valid local date and time", () => {
    expect(createRoomSchema.parse({ ...validRoom, dateTime: "2026-09-11T19:30" }).dateTime).toBe(
      "2026-09-11T19:30"
    );
  });

  it("rejects invalid date and time input", () => {
    expect(() => createRoomSchema.parse({ ...validRoom, dateTime: "not-a-date" })).toThrow(
      "Enter a valid date and time"
    );
  });

  it.each(["2026-02-30T19:30", "2026-02-29T19:30", "2026-09-11", "1", "2026-09-11T24:00"])(
    "rejects nonexistent calendar dates and incomplete timestamps: %s",
    (dateTime) => {
      expect(createRoomSchema.safeParse({ ...validRoom, dateTime }).success).toBe(false);
    }
  );

  it("accepts leap days and ISO timestamps", () => {
    for (const dateTime of ["2028-02-29T19:30", "2026-09-11T19:30:00.000Z", "2026-09-11T19:30:00-04:00"]) {
      expect(createRoomSchema.safeParse({ ...validRoom, dateTime }).success).toBe(true);
    }
  });

  it("rejects budgets that cannot be represented as a positive number of cents", () => {
    for (const totalBudgetDollars of [0.001, 12.345]) {
      expect(createRoomSchema.safeParse({ ...validRoom, totalBudgetDollars }).success).toBe(false);
    }
    expect(createRoomSchema.parse({ ...validRoom, totalBudgetDollars: "12.34" }).totalBudgetDollars).toBe(12.34);
  });

  it("keeps room text fields within their persistence limits", () => {
    expect(() => createRoomSchema.parse({ ...validRoom, title: "x".repeat(121) })).toThrow(
      "Use at most 120 characters"
    );
    expect(() => createRoomSchema.parse({ ...validRoom, location: "x".repeat(201) })).toThrow(
      "Use at most 200 characters"
    );
  });
});

it("deduplicates repeated preferences so repeated likes cannot inflate recommendations", () => {
  const result = joinRoomSchema.parse({
    name: "Guest", dietType: "OMNIVORE", spiceLevel: "NONE", likes: "rice, Rice, ,rice", allergies: "Peanut, peanut"
  });
  expect(result.likes).toHaveLength(1);
  expect(result.allergies).toHaveLength(1);
});

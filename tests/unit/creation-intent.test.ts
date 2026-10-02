import { describe, expect, it } from "vitest";
import { creationAuthHref, creationEventType, creationHref, signInCreationIntent } from "@/lib/creation-intent";

describe("constrained gathering creation intent", () => {
  it.each(["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"])("preserves %s across sign-in and provider retry", (value) => {
    const eventType = creationEventType(value);
    expect(creationHref(eventType)).toBe("/rooms/new?eventType=" + value);
    expect(creationAuthHref(eventType)).toBe("/auth?create=1&eventType=" + value);
    expect(signInCreationIntent({ create: "1", eventType: value })).toEqual({
      destination: "/rooms/new?eventType=" + value,
      errorDestination: "/auth?create=1&eventType=" + value + "&error=provider"
    });
  });

  it.each([undefined, "brunch", "https://attacker.invalid", "//attacker.invalid", ["BRUNCH"], ["BRUNCH", "BBQ"]])("rejects invalid or duplicated occasion %j", (value) => {
    expect(creationEventType(value)).toBeUndefined();
    expect(signInCreationIntent({ create: "1", eventType: value }).destination).toBe("/rooms/new");
  });

  it("keeps ordinary sign-in at the dashboard and does not accept duplicated intent", () => {
    expect(signInCreationIntent({ eventType: "BRUNCH" }).destination).toBe("/dashboard");
    expect(signInCreationIntent({ create: ["1", "1"], eventType: "BRUNCH" }).destination).toBe("/dashboard");
  });
});

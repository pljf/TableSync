import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const prefixes: string[] = [];

afterEach(async () => {
  for (const prefix of prefixes.splice(0)) {
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: prefix } } });
  }
});

describe("shared database rate limiter", () => {
  it("atomically caps concurrent requests and recovers after the window", async () => {
    const scope = `test-rate-limit-${crypto.randomUUID()}`;
    const prefix = `tablesync:${scope}:`;
    prefixes.push(prefix);
    const input = { scope, subject: "same-actor", limit: 3, windowSeconds: 60 };

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () => enforceRateLimit(input))
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(3);
    const rejected = attempts.filter((attempt) => attempt.status === "rejected");
    expect(rejected).toHaveLength(5);
    for (const attempt of rejected) {
      if (attempt.status === "rejected") expect(attempt.reason).toBeInstanceOf(RateLimitError);
    }

    await prisma.rateLimit.updateMany({
      where: { key: { startsWith: prefix } },
      data: { count: 99, lastRequest: BigInt(0) }
    });
    await expect(enforceRateLimit(input)).resolves.toBeUndefined();
    expect((await prisma.rateLimit.findFirst({ where: { key: { startsWith: prefix } } }))?.count).toBe(1);
  });
});

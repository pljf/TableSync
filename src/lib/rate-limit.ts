import { createHmac, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { authEnvironment } from "@/lib/auth-environment";
import type { RequestActors } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests. Wait a moment and try again.");
    this.name = "RateLimitError";
  }
}

function digest(value: string): string {
  return createHmac("sha256", authEnvironment.secret).update(value).digest("base64url");
}

export function actorRateLimitSubject(actors: RequestActors): string {
  if (actors.host) return `host:${actors.host.userId}`;
  if (actors.guest) return `guest:${actors.guest.guestId}`;
  return "anonymous";
}

export async function requestNetworkSubject(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
  return `network:${address}`;
}

export async function enforceRateLimit({
  scope,
  subject,
  limit,
  windowSeconds
}: {
  scope: string;
  subject: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const now = BigInt(Date.now());
  const cutoff = now - BigInt(windowSeconds * 1_000);
  const key = `tablesync:${scope}:${digest(subject)}`;
  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${randomUUID()}, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."lastRequest" <= ${cutoff} THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "lastRequest" = CASE
        WHEN "RateLimit"."lastRequest" <= ${cutoff} THEN ${now}
        ELSE "RateLimit"."lastRequest"
      END
    RETURNING "count"
  `);
  if ((rows[0]?.count ?? limit + 1) > limit) {
    throw new RateLimitError();
  }
}

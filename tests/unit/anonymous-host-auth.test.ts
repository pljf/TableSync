import { beforeEach, describe, expect, it, vi } from "vitest";

const updateRooms = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { dinnerRoom: { updateMany: updateRooms } }
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { auth } from "@/lib/auth";

const anonymousPlugin = auth.options.plugins[0];
const onLinkAccount = anonymousPlugin.options!.onLinkAccount!;

function linkFixture(guestId = "guest-host", accountId = "registered-host", nextAnonymous = false) {
  const timestamp = new Date("2026-09-08T00:00:00Z");
  const user = (id: string, isAnonymous: boolean) => ({
    id, isAnonymous, name: "Test host", email: `${id}@tablesync.invalid`,
    emailVerified: !isAnonymous, createdAt: timestamp, updatedAt: timestamp
  });
  const session = (userId: string) => ({
    id: `session-${userId}`, userId, token: `unit-session-${userId}`,
    createdAt: timestamp, updatedAt: timestamp, expiresAt: timestamp
  });
  return {
    anonymousUser: { user: user(guestId, true), session: session(guestId) },
    newUser: { user: user(accountId, nextAnonymous), session: session(accountId) },
    ctx: {} as Parameters<typeof onLinkAccount>[0]["ctx"]
  };
}

describe("anonymous host account linking", () => {
  beforeEach(() => {
    updateRooms.mockReset();
    updateRooms.mockResolvedValue({ count: 2 });
  });

  it("moves only the current anonymous host's rooms to their signed-in account", async () => {
    await onLinkAccount(linkFixture());
    expect(updateRooms).toHaveBeenCalledExactlyOnceWith({
      where: { hostId: "guest-host" },
      data: { hostId: "registered-host" }
    });
  });

  it("retains anonymous accounts to prevent cascading room deletion", () => {
    expect(anonymousPlugin.options?.disableDeleteAnonymousUser).toBe(true);
  });

  it("does not move data for the same account or another anonymous session", async () => {
    await onLinkAccount(linkFixture("guest-host", "guest-host"));
    await onLinkAccount(linkFixture("guest-host", "other-guest", true));
    expect(updateRooms).not.toHaveBeenCalled();
  });

  it("does not silently swallow a failed room transfer", async () => {
    updateRooms.mockRejectedValue(new Error("Room transfer failed"));
    await expect(onLinkAccount(linkFixture())).rejects.toThrow("Room transfer failed");
    expect(anonymousPlugin.options?.disableDeleteAnonymousUser).toBe(true);
  });
});

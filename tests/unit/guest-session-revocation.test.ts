import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionState = vi.hoisted(() => ({
  token: undefined as string | undefined,
  updateMany: vi.fn(),
  setCookie: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => sessionState.token ? { value: sessionState.token } : undefined,
    getAll: () => sessionState.token ? [{ name: "tablesync_guest_session", value: sessionState.token }] : [],
    set: sessionState.setCookie
  })
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { guestSession: { updateMany: sessionState.updateMany } }
}));
vi.mock("@/lib/auth-environment", () => ({
  authEnvironment: { secureCookies: true }
}));

import { hashGuestSessionToken, revokeCurrentGuestSession } from "@/lib/guest-session";

describe("meal guest session revocation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionState.token = undefined;
    sessionState.updateMany.mockResolvedValue({ count: 1 });
  });

  it("revokes the current browser session without mutating response cookies", async () => {
    sessionState.token = "current-browser-guest-session";
    await revokeCurrentGuestSession();
    expect(sessionState.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { tokenHash: { in: [hashGuestSessionToken(sessionState.token)] }, revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(sessionState.setCookie).not.toHaveBeenCalled();
  });

  it("does nothing when the browser has no meal guest session", async () => {
    await revokeCurrentGuestSession();
    expect(sessionState.updateMany).not.toHaveBeenCalled();
    expect(sessionState.setCookie).not.toHaveBeenCalled();
  });

  it("keeps the cookie available for retry if persistent revocation fails", async () => {
    sessionState.token = "current-browser-guest-session";
    sessionState.updateMany.mockRejectedValue(new Error("Database unavailable"));
    await expect(revokeCurrentGuestSession()).rejects.toThrow("Database unavailable");
    expect(sessionState.setCookie).not.toHaveBeenCalled();
  });
});

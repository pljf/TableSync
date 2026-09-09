import { beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  ready: true,
  secureCookies: true,
  trustedOrigins: ["https://tablesync.test", "https://preview.tablesync.test"],
  get: vi.fn(),
  getSession: vi.fn(),
  deleteHostSession: vi.fn(),
  post: vi.fn(),
  revokeGuest: vi.fn()
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: boundary.getSession } } }));
vi.mock("@/lib/prisma", () => ({ prisma: { session: { deleteMany: boundary.deleteHostSession } } }));
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: boundary.get, POST: boundary.post })
}));
vi.mock("@/lib/auth-environment", () => ({
  authEnvironment: {
    get sessionReady() { return boundary.ready; },
    get secureCookies() { return boundary.secureCookies; },
    get trustedOrigins() { return boundary.trustedOrigins; }
  }
}));
vi.mock("@/lib/guest-session", () => ({
  GUEST_SESSION_COOKIE: "tablesync_guest_session",
  revokeCurrentGuestSession: boundary.revokeGuest
}));

import { GET, POST } from "@/app/api/auth/[...all]/route";

function authPost(path: string, origin: string | null = "https://tablesync.test") {
  return new Request(`https://tablesync.test/api/auth${path}`, {
    method: "POST",
    headers: origin === null ? {} : { Origin: origin }
  });
}

describe("guest authentication route boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    boundary.ready = true;
    boundary.secureCookies = true;
    boundary.get.mockResolvedValue(Response.json(null));
    boundary.getSession.mockResolvedValue(null);
    boundary.deleteHostSession.mockResolvedValue({ count: 0 });
    boundary.post.mockResolvedValue(Response.json({ success: true }));
    boundary.revokeGuest.mockResolvedValue(undefined);
  });

  it("fails closed for both verbs when session configuration is unavailable", async () => {
    boundary.ready = false;
    const read = await GET(new Request("https://tablesync.test/api/auth/get-session"));
    const write = await POST(authPost("/sign-in/anonymous"));
    expect(read.status).toBe(503);
    expect(write.status).toBe(503);
    expect(read.headers.get("cache-control")).toBe("no-store");
    expect(boundary.get).not.toHaveBeenCalled();
    expect(boundary.post).not.toHaveBeenCalled();
    expect(boundary.revokeGuest).not.toHaveBeenCalled();
  });

  it.each([
    null,
    "null",
    "https://attacker.invalid",
    "https://tablesync.test.attacker.invalid",
    "https://tablesync.test/",
    "https://tablesync.test, https://attacker.invalid",
    "http://tablesync.test",
    "https://tablesync.test:8443"
  ])("rejects missing or inexact trusted origin %s before creating an anonymous session", async (origin) => {
    const response = await POST(authPost("/sign-in/anonymous", origin));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(boundary.post).not.toHaveBeenCalled();
    expect(boundary.revokeGuest).not.toHaveBeenCalled();
  });

  it.each(["https://tablesync.test", "https://preview.tablesync.test"])(
    "allows an exact configured trusted origin %s",
    async (origin) => {
      const request = authPost("/sign-in/anonymous", origin);
      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(boundary.post).toHaveBeenCalledExactlyOnceWith(request);
    }
  );

  it("also rejects untrusted origins before sign-out or revocation", async () => {
    const response = await POST(authPost("/sign-out", "https://attacker.invalid"));
    expect(response.status).toBe(403);
    expect(boundary.post).not.toHaveBeenCalled();
    expect(boundary.revokeGuest).not.toHaveBeenCalled();
  });

  it("leaves GET OAuth callbacks with their existing Better Auth validation", async () => {
    const request = new Request("https://tablesync.test/api/auth/callback/github?code=unit-code");
    await GET(request);
    expect(boundary.get).toHaveBeenCalledExactlyOnceWith(request);
  });

  it("does not revoke meal access when Better Auth rejects sign-out", async () => {
    boundary.post.mockResolvedValue(Response.json({ error: "Invalid origin" }, { status: 403 }));
    const response = await POST(authPost("/sign-out"));
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(boundary.revokeGuest).not.toHaveBeenCalled();
  });

  it.each([true, false])("preserves every host expiration and appends meal expiration with secure=%s", async (secureCookies) => {
    boundary.secureCookies = secureCookies;
    const hostCookie = "tablesync-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
    const hostCacheCookie = "tablesync-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
    const signedOut = Response.json({ success: true });
    signedOut.headers.append("Set-Cookie", hostCookie);
    signedOut.headers.append("Set-Cookie", hostCacheCookie);
    boundary.post.mockResolvedValue(signedOut);
    const response = await POST(authPost("/sign-out"));
    expect(response).toBe(signedOut);
    expect(response.headers.getSetCookie()).toEqual([
      hostCookie,
      hostCacheCookie,
      `tablesync_guest_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureCookies ? "; Secure" : ""}`
    ]);
    expect(boundary.revokeGuest).toHaveBeenCalledOnce();
  });

  it("does not revoke meal access for other successful auth operations", async () => {
    const response = await POST(authPost("/sign-in/anonymous"));
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(boundary.revokeGuest).not.toHaveBeenCalled();
  });

  it("expires every retained room response while preserving the host cookie expiration", async () => {
    const hostCookie = "tablesync-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
    const names = ["tablesync_guest_session", "tablesync_guest_session_room_0123456789abcdef01234567", "tablesync_guest_session_room_abcdef0123456789abcdef01"];
    boundary.post.mockResolvedValue(Response.json({ success: true }, { headers: { "Set-Cookie": hostCookie } }));
    boundary.revokeGuest.mockResolvedValue(names);
    const response = await POST(authPost("/sign-out"));
    expect(response.headers.getSetCookie()).toEqual([hostCookie, ...names.map((name) => `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`)]);
  });

  it("does not report successful sign-out if meal-session revocation fails", async () => {
    const hostCookie = "tablesync-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
    const signedOut = Response.json({ success: true }, { headers: { "Set-Cookie": hostCookie } });
    boundary.post.mockResolvedValue(signedOut);
    boundary.revokeGuest.mockRejectedValue(new Error("Database unavailable"));
    const response = await POST(authPost("/sign-out"));
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.text()).not.toContain("Database unavailable");
    expect(signedOut.headers.getSetCookie()).toEqual([hostCookie]);
  });

  it("ensures only the validated host session is persistently revoked", async () => {
    boundary.getSession.mockResolvedValue({ session: { token: "current-host-session" } });
    const request = authPost("/sign-out");
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(boundary.getSession).toHaveBeenCalledExactlyOnceWith({
      headers: request.headers, query: { disableCookieCache: true, disableRefresh: true }
    });
    expect(boundary.deleteHostSession).toHaveBeenCalledExactlyOnceWith({
      where: { token: "current-host-session" }
    });
  });

  it("rejects apparent sign-out success if host revocation cannot persist", async () => {
    boundary.getSession.mockResolvedValue({ session: { token: "current-host-session" } });
    boundary.deleteHostSession.mockRejectedValue(new Error("Private database error"));
    const response = await POST(authPost("/sign-out"));
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.text()).not.toContain("Private database error");
    expect(boundary.revokeGuest).not.toHaveBeenCalled();
  });

  it("keeps sign-out retryable when the current session cannot be checked", async () => {
    boundary.getSession.mockRejectedValue(new Error("Private database error"));
    const response = await POST(authPost("/sign-out"));
    expect(response.status).toBe(503);
    expect(boundary.post).not.toHaveBeenCalled();
    expect(boundary.deleteHostSession).not.toHaveBeenCalled();
    expect(boundary.revokeGuest).not.toHaveBeenCalled();
  });
});

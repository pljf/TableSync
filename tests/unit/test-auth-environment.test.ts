import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("integration-test session configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const name of ["VERCEL", "CF_PAGES", "AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_TRUSTED_ORIGINS"]) {
      vi.stubEnv(name, "");
    }
    vi.stubEnv("BETTER_AUTH_SECRET", "test-auth-fixture-session-secret-of-at-least-32-characters");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["http://localhost:3107", "local", "tablesync-auth.session_token", false],
    ["https://tablesync.test", "staging", "__Secure-tablesync-auth.session_token", true]
  ] as const)("matches application session cookies at %s without connecting to a database", async (origin, environment, name, secure) => {
    vi.stubEnv("BETTER_AUTH_URL", origin);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
    vi.stubEnv("TABLESYNC_DEPLOYMENT_ENV", environment);
    const [{ auth }, { testAuth }] = await Promise.all([
      import("@/lib/auth"), import("@/lib/test-auth")
    ]);
    const [application, integration] = await Promise.all([auth.$context, testAuth.$context]);
    const expected = {
      name,
      attributes: { httpOnly: true, sameSite: "lax", secure, path: "/" }
    };
    expect(application.authCookies.sessionToken).toMatchObject(expected);
    expect(integration.authCookies.sessionToken).toMatchObject(expected);
  });
});

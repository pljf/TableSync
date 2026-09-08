import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validSecret = "tablesync-local-unit-secret-64-characters-for-session-readiness";

async function inspectAuthEnvironment() {
  vi.resetModules();
  return (await import("@/lib/auth-environment")).authEnvironment;
}

describe("guest session environment", () => {
  beforeEach(() => {
    for (const name of [
      "AUTH_SECRET", "BETTER_AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET",
      "AUTH_TRUSTED_ORIGINS", "VERCEL", "CF_PAGES", "TABLESYNC_DEPLOYMENT_ENV",
      "TABLESYNC_E2E_AUTH", "TABLESYNC_E2E_AUTH_KEY"
    ]) {
      vi.stubEnv(name, "");
    }
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("enables local guest sessions without requiring an OAuth provider", async () => {
    const environment = await inspectAuthEnvironment();
    expect(environment.sessionReady).toBe(true);
    expect(environment.githubConfigured).toBe(false);
    expect(environment.productionReady).toBe(false);
    expect(environment.secretConfigured).toBe(false);
    expect(environment.secret.length).toBeGreaterThanOrEqual(32);
    expect(environment.secureCookies).toBe(false);
    const reloaded = await inspectAuthEnvironment();
    expect(reloaded.secret).toBe(environment.secret);
  });

  it("enables hosted guest access with a secure origin and configured secret", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://tablesync.test");
    vi.stubEnv("BETTER_AUTH_SECRET", validSecret);
    vi.stubEnv("TABLESYNC_DEPLOYMENT_ENV", "production");
    const environment = await inspectAuthEnvironment();
    expect(environment.sessionReady).toBe(true);
    expect(environment.secretConfigured).toBe(true);
    expect(environment.secureCookies).toBe(true);
    expect(environment.productionReady).toBe(false);
  });

  it.each(["VERCEL", "CF_PAGES", "TABLESYNC_DEPLOYMENT_ENV"])(
    "rejects a missing hosted secret when %s marks the deployment",
    async (marker) => {
      vi.stubEnv(marker, marker === "TABLESYNC_DEPLOYMENT_ENV" ? "staging" : "1");
      vi.stubEnv("BETTER_AUTH_URL", "https://tablesync.test");
      vi.stubEnv("TABLESYNC_E2E_AUTH", "1");
      expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
    }
  );

  it.each(["invalid-url", "http://tablesync.test", "https://tablesync.test"])(
    "does not use a local fallback secret for %s",
    async (baseUrl) => {
      vi.stubEnv("BETTER_AUTH_URL", baseUrl);
      expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
    }
  );

  it.each(["http://tablesync.test", "https://localhost:3000"])(
    "rejects a hosted base URL of %s even with a secret",
    async (baseUrl) => {
      vi.stubEnv("TABLESYNC_DEPLOYMENT_ENV", "production");
      vi.stubEnv("BETTER_AUTH_URL", baseUrl);
      vi.stubEnv("BETTER_AUTH_SECRET", validSecret);
      expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
    }
  );

  it("fails closed for an invalid trusted origin", async () => {
    vi.stubEnv("AUTH_TRUSTED_ORIGINS", "not-an-origin");
    expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
  });

  it("preserves the GitHub readiness requirement", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", validSecret);
    vi.stubEnv("AUTH_GITHUB_ID", "github-client-id");
    vi.stubEnv("AUTH_GITHUB_SECRET", "github-client-secret");
    const environment = await inspectAuthEnvironment();
    expect(environment.sessionReady).toBe(true);
    expect(environment.productionReady).toBe(true);
  });
});

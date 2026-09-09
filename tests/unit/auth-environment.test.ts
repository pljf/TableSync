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
      "TABLESYNC_E2E_AUTH", "TABLESYNC_E2E_AUTH_KEY", "NEXT_PUBLIC_APP_URL"
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
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tablesync.test");
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

  describe("hosted configuration", () => {
    beforeEach(() => {
      vi.stubEnv("TABLESYNC_DEPLOYMENT_ENV", "production");
      vi.stubEnv("BETTER_AUTH_URL", "https://tablesync.test");
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tablesync.test");
      vi.stubEnv("BETTER_AUTH_SECRET", validSecret);
    });

    it("accepts equivalent canonical origins with a trailing slash or default port", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tablesync.test:443/");
      const environment = await inspectAuthEnvironment();
      expect(environment.sessionReady).toBe(true);
      expect(environment.issues).toEqual([]);
      expect(environment.baseUrl).toBe("https://tablesync.test");
    });

    it.each([
      "", "not-a-url", "https://other.tablesync.test", "https://tablesync.test:8443",
      "https://tablesync.test/path", "https://tablesync.test?query=1",
      "https://tablesync.test#fragment", "https://name:credential@tablesync.test"
    ])("rejects an absent, mismatched or malformed app origin: %s", async (appUrl) => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
      expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
    });

    it("requires the explicit authentication origin when deployed", async () => {
      vi.stubEnv("BETTER_AUTH_URL", "");
      expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
    });

    it.each(["http://tablesync.test", "https://localhost.", "https://preview.localhost", "https://127.0.0.2"])(
      "rejects an insecure or local hosted origin: %s", async (origin) => {
        vi.stubEnv("BETTER_AUTH_URL", origin);
        vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
        expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
      }
    );

    it.each([" ".repeat(40), "replace-with-at-least-32-random-characters", "placeholder-session-secret-of-at-least-32-characters"])(
      "rejects a blank or placeholder session secret", async (secret) => {
        vi.stubEnv("BETTER_AUTH_SECRET", secret);
        expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
      }
    );

    it.each([
      "http://other.tablesync.test", "https://localhost", "https://other.tablesync.test/path",
      "https://user:credential@other.tablesync.test", "https://other.tablesync.test?query=1"
    ])("rejects an unsafe trusted origin: %s", async (origin) => {
      vi.stubEnv("AUTH_TRUSTED_ORIGINS", origin);
      expect((await inspectAuthEnvironment()).sessionReady).toBe(false);
    });

    it.each([
      ["github-client-id", ""], ["", "github-client-secret"],
      ["replace-client-id", "github-client-secret"], ["github-client-id", "placeholder-secret"]
    ])("fails closed for incomplete or placeholder GitHub credentials", async (id, secret) => {
      vi.stubEnv("AUTH_GITHUB_ID", id);
      vi.stubEnv("AUTH_GITHUB_SECRET", secret);
      const environment = await inspectAuthEnvironment();
      expect(environment.sessionReady).toBe(false);
      expect(environment.productionReady).toBe(false);
      expect(environment.issues.join(" ")).toContain("GitHub sign-in requires both");
    });

    it("allows configured GitHub alongside guest access", async () => {
      vi.stubEnv("AUTH_GITHUB_ID", "github-client-id");
      vi.stubEnv("AUTH_GITHUB_SECRET", "github-client-secret");
      const environment = await inspectAuthEnvironment();
      expect(environment.sessionReady).toBe(true);
      expect(environment.productionReady).toBe(true);
      expect(environment.githubConfigured).toBe(true);
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The command's environment is explicit in these tests; do not read developer credentials.
vi.mock("dotenv/config", () => ({}));

const previousExitCode = process.exitCode;
const stagingEnvironment = {
  AUTH_SECRET: "",
  AUTH_GITHUB_ID: "",
  AUTH_GITHUB_SECRET: "",
  AUTH_TRUSTED_ORIGINS: "https://tablesync.test",
  BETTER_AUTH_SECRET: "deployment-test-session-secret-at-least-32-characters",
  BETTER_AUTH_URL: "https://tablesync.test",
  NEXT_PUBLIC_APP_URL: "https://tablesync.test",
  VERCEL: "",
  CF_PAGES: "",
  DATABASE_URL: ["postgresql", "://", "runtime", ":", "unit-password", "@", "pool.database.test/tablesync?sslmode=verify-full"].join(""),
  DIRECT_URL: ["postgresql", "://", "migration", ":", "unit-password", "@", "direct.database.test/tablesync?sslmode=verify-full"].join(""),
  DATABASE_POOL_SIZE: "8",
  DATABASE_POOL_MAX_USES: "5000",
  DATABASE_RUNTIME_MODE: "pooled",
  TABLESYNC_DATABASE_SCOPE: "acceptance",
  TABLESYNC_DEPLOYMENT_ENV: "staging",
  TABLESYNC_DEPLOYMENT_ID: "unit-deployment",
  TABLESYNC_GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
  TABLESYNC_EXPECTED_MIGRATION: "20260908010000_correct_tofu_shopping_category",
  TABLESYNC_E2E_AUTH: "",
  TABLESYNC_E2E_AUTH_KEY: ""
};

async function runGate() {
  await import("../../scripts/validate-deployment-environment");
}

describe("deployment validation command", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const [name, value] of Object.entries(stagingEnvironment)) vi.stubEnv(name, value);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("accepts hosted guest-only access without GitHub credentials", async () => {
    await runGate();
    expect(process.exitCode).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
    expect(JSON.parse(vi.mocked(console.log).mock.calls[0][0])).toMatchObject({
      status: "ready", authentication: "guest-only"
    });
  });

  it("accepts optional GitHub and equivalent canonical URL spelling", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "unit-github-client");
    vi.stubEnv("AUTH_GITHUB_SECRET", "unit-github-secret");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tablesync.test:443/");
    await runGate();
    expect(process.exitCode).toBeUndefined();
    expect(JSON.parse(vi.mocked(console.log).mock.calls[0][0]).authentication).toBe("guest-and-github");
  });

  it.each([
    ["AUTH_GITHUB_ID", "unit-client-without-secret"],
    ["AUTH_GITHUB_SECRET", "placeholder-secret"],
    ["BETTER_AUTH_SECRET", ""],
    ["NEXT_PUBLIC_APP_URL", "https://other.tablesync.test"],
    ["AUTH_TRUSTED_ORIGINS", "http://other.tablesync.test"]
  ])("fails when %s makes authentication unavailable", async (name, value) => {
    vi.stubEnv(name, value);
    await runGate();
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it("does not print credential-bearing malformed origins", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://unit-user:private-origin-credential@tablesync.test/path");
    await runGate();
    expect(process.exitCode).toBe(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private-origin-credential");
  });

  it("still rejects local test authentication variables on staging", async () => {
    vi.stubEnv("TABLESYNC_E2E_AUTH", "1");
    await runGate();
    expect(process.exitCode).toBe(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).toContain("Local E2E authentication variables");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const databaseProbe = vi.hoisted(() => ({
  error: null as Error | null,
  rows: [] as Array<{ failedCount: bigint; migration: string | null }>
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: async () => {
      if (databaseProbe.error) throw databaseProbe.error;
      return databaseProbe.rows;
    }
  }
}));
vi.mock("@/lib/database-environment", () => ({
  inspectDatabaseEnvironment: () => ({ ready: true })
}));
vi.mock("@/lib/deployment-environment", () => ({
  isManagedDeployment: () => true,
  inspectDeploymentEnvironment: () => ({
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    deploymentEnvironment: "staging",
    deploymentId: "deployment-verified",
    expectedMigration: "20260908010000_correct_tofu_shopping_category",
    managedDeployment: true,
    ready: true
  })
}));

async function getHealth() {
  const { GET } = await import("@/app/api/health/route");
  return GET();
}

describe("deployment readiness route", () => {
  beforeEach(() => {
    databaseProbe.error = null;
    databaseProbe.rows = [];
    vi.restoreAllMocks();
    vi.resetModules();
    for (const name of ["AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_TRUSTED_ORIGINS", "VERCEL", "CF_PAGES"]) {
      vi.stubEnv(name, "");
    }
    vi.stubEnv("TABLESYNC_DEPLOYMENT_ENV", "staging");
    vi.stubEnv("BETTER_AUTH_URL", "https://tablesync.test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tablesync.test");
    vi.stubEnv("BETTER_AUTH_SECRET", "health-test-session-secret-at-least-32-characters");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns attributable guest-only readiness for the reviewed successful migration head", async () => {
    databaseProbe.rows = [
      { failedCount: 0n, migration: "20260908010000_correct_tofu_shopping_category" }
    ];
    const response = await getHealth();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      environment: "staging",
      deploymentId: "deployment-verified",
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      migration: "20260908010000_correct_tofu_shopping_category"
    });
  });

  it("fails closed when the database migration head is stale", async () => {
    databaseProbe.rows = [{ failedCount: 0n, migration: "20260802013000_secure_guest_sessions" }];
    const response = await getHealth();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "not_ready",
      migration: "20260802013000_secure_guest_sessions"
    });
  });

  it.each([
    ["BETTER_AUTH_SECRET", ""],
    ["BETTER_AUTH_URL", "http://tablesync.test"],
    ["NEXT_PUBLIC_APP_URL", "https://other.tablesync.test"],
    ["AUTH_TRUSTED_ORIGINS", "not-an-origin"],
    ["AUTH_GITHUB_ID", "github-client-without-secret"]
  ])("returns 503 despite a healthy database when %s invalidates authentication", async (name, value) => {
    vi.stubEnv(name, value);
    databaseProbe.rows = [{ failedCount: 0n, migration: "20260908010000_correct_tofu_shopping_category" }];
    const response = await getHealth();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ status: "not_ready" });
  });

  it("returns a generic 503 without leaking a database error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    databaseProbe.error = new Error("connection failed with operator-private-credential");
    const response = await getHealth();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).not.toContain("operator-private-credential");
    expect(consoleError).toHaveBeenCalledWith("Health readiness probe failed", {
      environment: "staging",
      errorType: "Error"
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("operator-private-credential");
  });
});

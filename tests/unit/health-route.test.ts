import { beforeEach, describe, expect, it, vi } from "vitest";

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
  inspectDeploymentEnvironment: () => ({
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    deploymentEnvironment: "staging",
    deploymentId: "deployment-verified",
    expectedMigration: "20260802023000_security_audit",
    managedDeployment: true,
    ready: true
  })
}));

import { GET } from "@/app/api/health/route";

describe("deployment readiness route", () => {
  beforeEach(() => {
    databaseProbe.error = null;
    databaseProbe.rows = [];
    vi.restoreAllMocks();
  });

  it("returns attributable readiness only for the reviewed successful migration head", async () => {
    databaseProbe.rows = [
      { failedCount: 0n, migration: "20260802023000_security_audit" }
    ];
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      environment: "staging",
      deploymentId: "deployment-verified",
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      migration: "20260802023000_security_audit"
    });
  });

  it("fails closed when the database migration head is stale", async () => {
    databaseProbe.rows = [{ failedCount: 0n, migration: "20260802013000_secure_guest_sessions" }];
    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "not_ready",
      migration: "20260802013000_secure_guest_sessions"
    });
  });

  it("returns a generic 503 without leaking a database error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    databaseProbe.error = new Error("connection failed with operator-private-credential");
    const response = await GET();
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

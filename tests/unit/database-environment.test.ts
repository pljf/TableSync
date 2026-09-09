import { describe, expect, it } from "vitest";
import { assertRuntimeDatabaseEnvironment, inspectDatabaseEnvironment } from "@/lib/database-environment";
import { inspectDeploymentEnvironment } from "@/lib/deployment-environment";

function databaseUrl(user: string, password: string, host: string, port: number, tls = "") {
  return ["postgresql", "://", user, ":", password, "@", host, ":", String(port), "/tablesync", tls].join("");
}

describe("database environment", () => {
  it.each(["VERCEL", "CF_PAGES"])("cannot bypass hosted database safeguards by omitting deployment metadata on %s", (provider) => {
    const environment = {
      [provider]: "1",
      DATABASE_URL: "postgresql://tablesync:tablesync@127.0.0.1:5432/tablesync",
      TABLESYNC_DEPLOYMENT_ENV: "local",
      DATABASE_POOL_SIZE: "1"
    };
    const database = inspectDatabaseEnvironment(environment);
    expect(database.managedDeployment).toBe(true);
    expect(database.ready).toBe(false);
    expect(() => assertRuntimeDatabaseEnvironment(environment)).toThrow("Unsafe deployed database configuration");
    expect(inspectDeploymentEnvironment(environment).ready).toBe(false);
    expect(inspectDeploymentEnvironment({ [provider]: "1" }).ready).toBe(false);
  });
  it("keeps local development compatible with one direct connection", () => {
    const result = inspectDatabaseEnvironment({
      DATABASE_URL: "postgresql://tablesync:tablesync@127.0.0.1:5432/tablesync",
      DATABASE_POOL_SIZE: "1",
      TABLESYNC_DEPLOYMENT_ENV: "local"
    });

    expect(result.ready).toBe(true);
    expect(result.managedDeployment).toBe(false);
  });

  it("rejects an unencrypted shared-role staging connection", () => {
    const result = inspectDatabaseEnvironment({
      DATABASE_URL: databaseUrl("shared", "secret", "pool.example.com", 5432),
      DIRECT_URL: databaseUrl("shared", "secret", "pool.example.com", 5432),
      DATABASE_POOL_SIZE: "50",
      TABLESYNC_DATABASE_SCOPE: "acceptance",
      TABLESYNC_DEPLOYMENT_ENV: "staging"
    });

    expect(result.ready).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("TLS"),
        expect.stringContaining("distinct pooled and direct"),
        expect.stringContaining("distinct least-privilege roles")
      ])
    );
  });

  it("accepts bounded pooled runtime and separate direct migration roles", () => {
    const result = inspectDatabaseEnvironment({
      DATABASE_URL: databaseUrl(
        "tablesync_runtime",
        "runtime-secret",
        "pool.example.com",
        6543,
        "?sslmode=verify-full"
      ),
      DIRECT_URL: databaseUrl(
        "tablesync_migration",
        "migration-secret",
        "direct.example.com",
        5432,
        "?sslmode=verify-full"
      ),
      DATABASE_POOL_SIZE: "8",
      DATABASE_POOL_MAX_USES: "5000",
      DATABASE_RUNTIME_MODE: "pooled",
      TABLESYNC_DATABASE_SCOPE: "acceptance",
      TABLESYNC_DEPLOYMENT_ENV: "staging"
    });

    expect(result.ready).toBe(true);
    expect(result.poolSize).toBe(8);
    expect(result.poolMaxUses).toBe(5000);
  });

  it("keeps the direct migration credential out of the deployed web runtime", () => {
    const safe = inspectDatabaseEnvironment({
      DATABASE_URL: databaseUrl(
        "tablesync_runtime",
        "runtime-secret",
        "pool.example.com",
        6543,
        "?sslmode=verify-full"
      ),
      DATABASE_POOL_SIZE: "8",
      DATABASE_POOL_MAX_USES: "5000",
      DATABASE_RUNTIME_MODE: "pooled",
      TABLESYNC_DATABASE_SCOPE: "runtime",
      TABLESYNC_DEPLOYMENT_ENV: "staging"
    });
    expect(safe.ready).toBe(true);
    expect(safe.direct).toBeNull();

    const leaked = inspectDatabaseEnvironment({
      DATABASE_URL: safe.runtime!.raw,
      DIRECT_URL: databaseUrl(
        "tablesync_migration",
        "migration-secret",
        "direct.example.com",
        5432,
        "?sslmode=verify-full"
      ),
      DATABASE_POOL_SIZE: "8",
      DATABASE_POOL_MAX_USES: "5000",
      DATABASE_RUNTIME_MODE: "pooled",
      TABLESYNC_DATABASE_SCOPE: "runtime",
      TABLESYNC_DEPLOYMENT_ENV: "staging"
    });
    expect(leaked.ready).toBe(false);
    expect(leaked.issues).toContain("DIRECT_URL must not be exposed to the application runtime process.");
  });
});

describe("deployment attribution", () => {
  it("requires a deployment ID, commit, and migration head in staging", () => {
    const result = inspectDeploymentEnvironment({ TABLESYNC_DEPLOYMENT_ENV: "staging" });
    expect(result.ready).toBe(false);
    expect(result.issues).toHaveLength(3);
  });

  it("accepts attributable staging metadata", () => {
    const result = inspectDeploymentEnvironment({
      TABLESYNC_DEPLOYMENT_ENV: "staging",
      TABLESYNC_DEPLOYMENT_ID: "staging-20260801-01",
      TABLESYNC_GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
      TABLESYNC_EXPECTED_MIGRATION: "20260802023000_security_audit"
    });
    expect(result.ready).toBe(true);
  });
});

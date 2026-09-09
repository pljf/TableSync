import { describe, expect, it } from "vitest";
import { databaseSecurityReport, type RoleProbe } from "../../scripts/lib/database-security";
import { configureDatabaseTestPool } from "../../scripts/lib/database-test-environment";
import { inspectDatabaseEnvironment } from "@/lib/database-environment";

const runtime: RoleProbe = {
  role: "private-runtime-role",
  ssl: true,
  rolsuper: false,
  rolcreaterole: false,
  rolcreatedb: false,
  rolreplication: false,
  rolbypassrls: false,
  canCreateInDatabase: false,
  canCreateInPublic: false,
  canUsePublic: true,
  canReadMigrations: true,
  ownsApplicationTables: 0,
  allApplicationCrud: true,
  anyDangerousTableGrant: false
};
const migration: RoleProbe = { ...runtime, role: "private-migration-role", canCreateInPublic: true };

describe("database security evidence", () => {
  it("accepts separate bounded roles and never includes raw role names", () => {
    const report = databaseSecurityReport(runtime, migration, "staging");
    expect(report.status).toBe("passed");
    expect(report.runtime.migrationHistoryReadable).toBe(true);
    expect(report.runtime.fingerprint).not.toBe(report.migration.fingerprint);
    expect(JSON.stringify(report)).not.toContain(runtime.role);
    expect(JSON.stringify(report)).not.toContain(migration.role);
  });

  it.each([
    ["missing application write privileges", { allApplicationCrud: false }],
    ["unreadable health migration history", { canReadMigrations: false }],
    ["inaccessible application schema", { canUsePublic: false }],
    ["table ownership", { ownsApplicationTables: 1 }],
    ["dangerous table grants", { anyDangerousTableGrant: true }],
    ["unencrypted runtime", { ssl: false }],
    ["superuser", { rolsuper: true }],
    ["role creation", { rolcreaterole: true }],
    ["database creation", { rolcreatedb: true }],
    ["replication", { rolreplication: true }],
    ["RLS bypass", { rolbypassrls: true }],
    ["schema object creation", { canCreateInPublic: true }],
    ["database object creation", { canCreateInDatabase: true }]
  ])("rejects runtime %s", (_name, changes) => {
    expect(databaseSecurityReport({ ...runtime, ...changes }, migration, "staging").status).toBe("failed");
  });

  it("requires the migration role to create objects in the application schema", () => {
    const report = databaseSecurityReport(runtime, { ...migration, canCreateInDatabase: true, canCreateInPublic: false }, "staging");
    expect(report.status).toBe("failed");
    expect(report.migration.canApplyMigrations).toBe(false);
  });

  it("requires the migration role to access the application schema", () => {
    const report = databaseSecurityReport(runtime, { ...migration, canUsePublic: false }, "staging");
    expect(report.status).toBe("failed");
    expect(report.migration.applicationSchemaAccessible).toBe(false);
    expect(report.migration.canApplyMigrations).toBe(false);
  });

  it("rejects a shared role and elevated migration credentials", () => {
    expect(databaseSecurityReport(runtime, { ...migration, role: runtime.role }, "staging").status).toBe("failed");
    expect(databaseSecurityReport(runtime, { ...migration, rolsuper: true }, "staging").status).toBe("failed");
  });
});

describe("database test process configuration", () => {
  it.each(["staging", "production"])("preserves valid %s settings through the database test configuration", (deployment) => {
    const connection = (role: string, host: string) => ["postgresql", "://", role, ":", "example", "@", host, "/tablesync?sslmode=verify-full"].join("");
    const environment = {
      TABLESYNC_DEPLOYMENT_ENV: deployment,
      TABLESYNC_DATABASE_SCOPE: "acceptance",
      DATABASE_RUNTIME_MODE: "pooled",
      DATABASE_URL: connection("runtime", "pool.example.invalid"),
      DIRECT_URL: connection("migration", "direct.example.invalid"),
      DATABASE_POOL_SIZE: "8",
      DATABASE_POOL_MAX_USES: "5000"
    };
    configureDatabaseTestPool(environment);
    expect(inspectDatabaseEnvironment(environment)).toMatchObject({ ready: true, poolSize: 8, poolMaxUses: 5000 });
  });

  it.each(["VERCEL", "CF_PAGES"])("does not replace missing hosted settings with local defaults on %s", (provider) => {
    const environment: Record<string, string | undefined> = { [provider]: "1" };
    configureDatabaseTestPool(environment);
    expect(environment.DATABASE_POOL_MAX_USES).toBeUndefined();
    expect(inspectDatabaseEnvironment(environment).ready).toBe(false);
  });

  it("uses the safe single-connection local test settings", () => {
    const environment = { TABLESYNC_DEPLOYMENT_ENV: "local", DATABASE_POOL_SIZE: "8", DATABASE_POOL_MAX_USES: "5000" };
    configureDatabaseTestPool(environment);
    expect(environment).toMatchObject({ DATABASE_POOL_SIZE: "1", DATABASE_POOL_MAX_USES: "0" });
  });
});

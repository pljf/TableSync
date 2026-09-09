import { describe, expect, it } from "vitest";
import { validateStagingE2EEnvironment } from "../../scripts/lib/staging-e2e-preflight";
import { validateStagingHealth } from "../../scripts/lib/staging-target";

function stagingEnvironment(): Record<string, string | undefined> {
  const databaseUrl = (role: string, host: string) =>
    ["postgresql", "://", role, ":", "unit-fixture", "@", host, "/tablesync?sslmode=verify-full"].join("");
  return {
    TABLESYNC_E2E_BASE_URL: "https://staging.example.com/",
    BETTER_AUTH_URL: "https://staging.example.com",
    NEXT_PUBLIC_APP_URL: "https://staging.example.com",
    TABLESYNC_DEPLOYMENT_ENV: "staging",
    TABLESYNC_DEPLOYMENT_ID: "staging-fixture",
    TABLESYNC_GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
    TABLESYNC_EXPECTED_MIGRATION: "20260908010000_correct_tofu_shopping_category",
    TABLESYNC_DATABASE_SCOPE: "acceptance",
    DATABASE_URL: databaseUrl("runtime", "pool.example.com"),
    DIRECT_URL: databaseUrl("migrator", "direct.example.com"),
    DATABASE_RUNTIME_MODE: "pooled",
    DATABASE_POOL_SIZE: "5",
    DATABASE_POOL_MAX_USES: "5000",
    TABLESYNC_STAGING_SESSION_COOKIE: "unit-fixture-session"
  };
}

describe("staging browser acceptance preflight", () => {
  it("accepts explicit attribution and protected database scope without requiring GitHub credentials", () => {
    const configuration = validateStagingE2EEnvironment(stagingEnvironment());
    expect(configuration.baseUrl.origin).toBe("https://staging.example.com");
    expect(configuration.deployment.deploymentEnvironment).toBe("staging");
    expect(configuration.sessionCookieName).toBe("__Secure-tablesync-auth.session_token");
  });

  it.each(["TABLESYNC_DEPLOYMENT_ID", "TABLESYNC_GIT_SHA", "TABLESYNC_EXPECTED_MIGRATION"])(
    "rejects missing %s before a remote run or cleanup",
    (key) => {
      const environment = stagingEnvironment();
      delete environment[key];
      expect(() => validateStagingE2EEnvironment(environment)).toThrow(key);
    }
  );

  it.each(["local", "ci", "production"])("rejects the %s deployment environment", (value) => {
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), TABLESYNC_DEPLOYMENT_ENV: value }))
      .toThrow("TABLESYNC_DEPLOYMENT_ENV must be staging");
  });

  it.each([undefined, "local", "runtime"])("rejects database scope %s before cleanup", (value) => {
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), TABLESYNC_DATABASE_SCOPE: value }))
      .toThrow("TABLESYNC_DATABASE_SCOPE must be acceptance");
  });

  it("rejects a missing acceptance connection and unsafe pool settings", () => {
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), DIRECT_URL: undefined })).toThrow("DIRECT_URL");
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), DATABASE_POOL_MAX_USES: "0" }))
      .toThrow("DATABASE_POOL_MAX_USES");
  });

  it.each(["TABLESYNC_E2E_AUTH", "TABLESYNC_E2E_AUTH_KEY"])("rejects local authentication variable %s", (key) => {
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), [key]: "local-fixture" }))
      .toThrow("Local test authentication must not be configured");
  });

  it.each([
    "not-a-url",
    "http://staging.example.com",
    "https://localhost",
    "https://staging.example.com/dashboard",
    "https://staging.example.com?token=fixture",
    "https://staging.example.com#fragment",
    "https://fixture:private@staging.example.com"
  ])("rejects an invalid or ambiguous deployment origin %s", (baseUrl) => {
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), TABLESYNC_E2E_BASE_URL: baseUrl })).toThrow();
  });

  it("requires the supplied session and restricts its cookie name", () => {
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), TABLESYNC_STAGING_SESSION_COOKIE: undefined }))
      .toThrow("TABLESYNC_STAGING_SESSION_COOKIE is required");
    expect(() => validateStagingE2EEnvironment({ ...stagingEnvironment(), TABLESYNC_STAGING_SESSION_COOKIE_NAME: "unrelated" }))
      .toThrow("not an approved TableSync session cookie");
  });
});

describe("staging health attribution", () => {
  const { deployment } = validateStagingE2EEnvironment(stagingEnvironment());
  const readyHealth = {
    status: "ready",
    environment: "staging",
    deploymentId: deployment.deploymentId,
    commitSha: deployment.commitSha,
    migration: deployment.expectedMigration
  };

  it("accepts the reviewed staging release", () => {
    expect(() => validateStagingHealth(readyHealth, deployment)).not.toThrow();
  });

  it.each(["environment", "deploymentId", "commitSha", "migration"])("rejects a mismatched %s", (key) => {
    expect(() => validateStagingHealth({ ...readyHealth, [key]: "another-release" }, deployment)).toThrow("attribution");
  });

  it("rejects missing identity even when a server reports ready", () => {
    expect(() => validateStagingHealth({ status: "ready" }, deployment)).toThrow("attribution");
  });

  it.each([null, [], { status: "not_ready" }, "ready"])("rejects a malformed or unready health response", (body) => {
    expect(() => validateStagingHealth(body, deployment)).toThrow("did not report readiness");
  });
});

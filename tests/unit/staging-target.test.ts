import { describe, expect, it } from "vitest";
import { validateStagingHealth, validateStagingTarget } from "../../scripts/lib/staging-target";

const origin = "https://staging.example.com";
const environment = {
  BETTER_AUTH_URL: origin,
  NEXT_PUBLIC_APP_URL: origin,
  TABLESYNC_DEPLOYMENT_ENV: "staging",
  TABLESYNC_DEPLOYMENT_ID: "staging-fixture",
  TABLESYNC_GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
  TABLESYNC_EXPECTED_MIGRATION: "20260908010000_correct_tofu_shopping_category"
};

describe.each(["TABLESYNC_E2E_BASE_URL", "TABLESYNC_LIGHTHOUSE_BASE_URL"] as const)("%s destination protection", (targetVariable) => {
  const configuration = { ...environment, [targetVariable]: origin };

  it("accepts the same origin with normalized casing, default port, and root slash", () => {
    const target = validateStagingTarget({ ...configuration, [targetVariable]: "https://STAGING.example.com:443/" }, targetVariable);
    expect(target.baseUrl.origin).toBe(origin);
  });

  it("rejects another HTTPS host even if that host could copy public release metadata", () => {
    expect(() => validateStagingTarget({ ...configuration, [targetVariable]: "https://mistyped.example.com" }, targetVariable))
      .toThrow("must match both BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL");
  });

  it.each(["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"])("requires matching explicit %s", (canonicalVariable) => {
    expect(() => validateStagingTarget({ ...configuration, [canonicalVariable]: undefined }, targetVariable))
      .toThrow(`${canonicalVariable} is required`);
    expect(() => validateStagingTarget({ ...configuration, [canonicalVariable]: "https://another.example.com" }, targetVariable))
      .toThrow("must match both");
  });

  it.each([
    "https://localhost.",
    "https://app.localhost",
    "https://app.local",
    "https://127.2.3.4",
    "https://127.1",
    "https://2130706433",
    "https://0x7f000001",
    "https://[::1]",
    "https://[::ffff:127.0.0.1]"
  ])("rejects local target variants even when all configured origins agree: %s", (local) => {
    expect(() => validateStagingTarget({ ...configuration, [targetVariable]: local, BETTER_AUTH_URL: local, NEXT_PUBLIC_APP_URL: local }, targetVariable))
      .toThrow("non-local deployment hostname");
  });

  it.each([
    `${origin}/dashboard`,
    `${origin}/discard/..`,
    `${origin}/?`,
    `${origin}/#`,
    `${origin}\\`,
    "https://fixture:private@staging.example.com",
    "https://@staging.example.com"
  ])("rejects non-origin syntax before any cookie can be attached: %s", (invalid) => {
    expect(() => validateStagingTarget({ ...configuration, [targetVariable]: invalid }, targetVariable))
      .toThrow("without credentials, a path, query, or fragment");
  });

  it("does not accept canonical origins containing ignored paths", () => {
    expect(() => validateStagingTarget({ ...configuration, BETTER_AUTH_URL: `${origin}/auth` }, targetVariable)).toThrow("BETTER_AUTH_URL");
    expect(() => validateStagingTarget({ ...configuration, NEXT_PUBLIC_APP_URL: `${origin}/dashboard` }, targetVariable)).toThrow("NEXT_PUBLIC_APP_URL");
  });

  it("requires reviewed release metadata for both runners", () => {
    expect(() => validateStagingTarget({ ...configuration, TABLESYNC_GIT_SHA: "" }, targetVariable)).toThrow("TABLESYNC_GIT_SHA");
  });
});

describe("remote Lighthouse readiness", () => {
  const { deployment } = validateStagingTarget({ ...environment, TABLESYNC_LIGHTHOUSE_BASE_URL: origin }, "TABLESYNC_LIGHTHOUSE_BASE_URL");

  it("rejects unready, mismatched, or unidentifiable hosted audit targets", () => {
    const healthy = {
      status: "ready",
      environment: "staging",
      deploymentId: deployment.deploymentId,
      commitSha: deployment.commitSha,
      migration: deployment.expectedMigration
    };
    expect(() => validateStagingHealth(healthy, deployment)).not.toThrow();
    expect(() => validateStagingHealth({ ...healthy, status: "not_ready" }, deployment)).toThrow("readiness");
    expect(() => validateStagingHealth({ ...healthy, deploymentId: "previous-release" }, deployment)).toThrow("attribution");
    expect(() => validateStagingHealth({ status: "ready" }, deployment)).toThrow("attribution");
  });
});

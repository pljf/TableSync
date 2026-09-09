import { describe, expect, it } from "vitest";
import { inspectDeploymentEnvironment } from "@/lib/deployment-environment";

const reviewedDeployment = {
  TABLESYNC_DEPLOYMENT_ENV: "staging",
  TABLESYNC_EXPECTED_MIGRATION: "20260908010000_correct_tofu_shopping_category"
};
const explicitIdentity = {
  TABLESYNC_DEPLOYMENT_ID: "reviewed-deployment",
  TABLESYNC_GIT_SHA: "1111111111111111111111111111111111111111"
};
const vercelIdentity = {
  VERCEL: "1",
  VERCEL_DEPLOYMENT_ID: "dpl_current",
  VERCEL_GIT_COMMIT_SHA: "2222222222222222222222222222222222222222"
};

describe("Vercel deployment attribution", () => {
  it("accepts provider identity without manually configuring each deployment", () => {
    expect(inspectDeploymentEnvironment({ ...reviewedDeployment, ...vercelIdentity })).toMatchObject({
      ready: true,
      deploymentId: "dpl_current",
      commitSha: vercelIdentity.VERCEL_GIT_COMMIT_SHA,
      issues: []
    });
  });

  it("reports the new provider identity after redeployment despite stale explicit settings", () => {
    const environment = { ...reviewedDeployment, ...explicitIdentity, ...vercelIdentity };
    expect(inspectDeploymentEnvironment(environment).deploymentId).toBe("dpl_current");
    const redeployed = inspectDeploymentEnvironment({
      ...environment,
      VERCEL_DEPLOYMENT_ID: "dpl_next",
      VERCEL_GIT_COMMIT_SHA: "3333333333333333333333333333333333333333"
    });
    expect(redeployed).toMatchObject({
      ready: true, deploymentId: "dpl_next", commitSha: "3333333333333333333333333333333333333333"
    });
  });

  it.each([undefined, "", "   "])("uses explicit metadata when provider values are absent or blank", (value) => {
    const result = inspectDeploymentEnvironment({
      ...reviewedDeployment, ...explicitIdentity, VERCEL: "1",
      VERCEL_DEPLOYMENT_ID: value, VERCEL_GIT_COMMIT_SHA: value
    });
    expect(result).toMatchObject({
      ready: true, deploymentId: explicitIdentity.TABLESYNC_DEPLOYMENT_ID, commitSha: explicitIdentity.TABLESYNC_GIT_SHA
    });
  });

  it("falls back independently when a deployment has no provider Git metadata", () => {
    const result = inspectDeploymentEnvironment({
      ...reviewedDeployment, ...explicitIdentity, ...vercelIdentity, VERCEL_GIT_COMMIT_SHA: undefined
    });
    expect(result).toMatchObject({ ready: true, deploymentId: "dpl_current", commitSha: explicitIdentity.TABLESYNC_GIT_SHA });
  });

  it.each([undefined, "", "0", "true"])("keeps acceptance identity explicit unless VERCEL is exactly 1", (marker) => {
    const result = inspectDeploymentEnvironment({
      ...reviewedDeployment, ...explicitIdentity, ...vercelIdentity,
      VERCEL: marker, TABLESYNC_DATABASE_SCOPE: "acceptance"
    });
    expect(result).toMatchObject({
      ready: true, deploymentId: explicitIdentity.TABLESYNC_DEPLOYMENT_ID, commitSha: explicitIdentity.TABLESYNC_GIT_SHA
    });
  });

  it("rejects invalid provider identity instead of masking it with explicit metadata", () => {
    const result = inspectDeploymentEnvironment({
      ...reviewedDeployment, ...explicitIdentity, ...vercelIdentity,
      VERCEL_DEPLOYMENT_ID: "local", VERCEL_GIT_COMMIT_SHA: "not-a-commit"
    });
    expect(result.ready).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("VERCEL_DEPLOYMENT_ID"), expect.stringContaining("VERCEL_GIT_COMMIT_SHA")
    ]));
  });

  it("still fails closed when neither identity source is available", () => {
    const result = inspectDeploymentEnvironment({ ...reviewedDeployment, VERCEL: "1" });
    expect(result.ready).toBe(false);
    expect(result.issues).toHaveLength(2);
  });

  it("keeps TableSync staging explicit even on Vercel's production environment", () => {
    const result = inspectDeploymentEnvironment({ ...reviewedDeployment, ...vercelIdentity, VERCEL_ENV: "production" });
    expect(result).toMatchObject({ ready: true, deploymentEnvironment: "staging" });
    const missingEnvironment = inspectDeploymentEnvironment({
      ...vercelIdentity, VERCEL_ENV: "production", TABLESYNC_EXPECTED_MIGRATION: reviewedDeployment.TABLESYNC_EXPECTED_MIGRATION
    });
    expect(missingEnvironment.ready).toBe(false);
    expect(missingEnvironment.issues).toContain("TABLESYNC_DEPLOYMENT_ENV must be staging or production on a hosting platform.");
  });
});

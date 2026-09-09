const DEPLOYED_ENVIRONMENTS = new Set(["staging", "production"]);

type Environment = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function isManagedDeployment(environment: Environment = process.env): boolean {
  return Boolean(environment.VERCEL || environment.CF_PAGES) ||
    DEPLOYED_ENVIRONMENTS.has((environment.TABLESYNC_DEPLOYMENT_ENV ?? "").trim().toLowerCase());
}

export type DeploymentInspection = {
  commitSha: string;
  deploymentEnvironment: string;
  deploymentId: string;
  expectedMigration: string;
  issues: string[];
  managedDeployment: boolean;
  ready: boolean;
};

export function inspectDeploymentEnvironment(environment: Environment = process.env): DeploymentInspection {
  const deploymentEnvironment = (environment.TABLESYNC_DEPLOYMENT_ENV ?? "local").trim().toLowerCase();
  // Provider identity changes with each deployment; stale project settings must
  // not override it. Other hosts and the separate acceptance job use explicit identity.
  const vercel = environment.VERCEL === "1";
  const providerDeploymentId = vercel ? environment.VERCEL_DEPLOYMENT_ID?.trim() : undefined;
  const providerCommitSha = vercel ? environment.VERCEL_GIT_COMMIT_SHA?.trim() : undefined;
  const deploymentId = providerDeploymentId || environment.TABLESYNC_DEPLOYMENT_ID?.trim() || "local";
  const commitSha = providerCommitSha || environment.TABLESYNC_GIT_SHA?.trim() || "local";
  const expectedMigration = (environment.TABLESYNC_EXPECTED_MIGRATION ?? "").trim();
  const managedDeployment = isManagedDeployment(environment);
  const issues: string[] = [];

  if (environment.TABLESYNC_DEPLOYMENT_ENV && !["local", "ci", "staging", "production"].includes(deploymentEnvironment)) {
    issues.push("TABLESYNC_DEPLOYMENT_ENV must be local, ci, staging, or production.");
  }
  if (managedDeployment) {
    if (!DEPLOYED_ENVIRONMENTS.has(deploymentEnvironment)) {
      issues.push("TABLESYNC_DEPLOYMENT_ENV must be staging or production on a hosting platform.");
    }
    if (!deploymentId || deploymentId === "local") {
      issues.push("TABLESYNC_DEPLOYMENT_ID or Vercel's VERCEL_DEPLOYMENT_ID is required for deployed environments.");
    }
    if (!/^[a-f0-9]{7,64}$/i.test(commitSha)) {
      issues.push("TABLESYNC_GIT_SHA or Vercel's VERCEL_GIT_COMMIT_SHA must contain the deployed commit SHA.");
    }
    if (!/^\d{14}_[a-z0-9_]+$/.test(expectedMigration)) {
      issues.push("TABLESYNC_EXPECTED_MIGRATION must identify the reviewed migration head.");
    }
  }

  return {
    commitSha,
    deploymentEnvironment,
    deploymentId,
    expectedMigration,
    issues,
    managedDeployment,
    ready: issues.length === 0
  };
}

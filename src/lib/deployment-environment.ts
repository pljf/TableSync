const DEPLOYED_ENVIRONMENTS = new Set(["staging", "production"]);

type Environment = NodeJS.ProcessEnv | Record<string, string | undefined>;

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
  const deploymentId = (environment.TABLESYNC_DEPLOYMENT_ID ?? "local").trim();
  const commitSha = (environment.TABLESYNC_GIT_SHA ?? "local").trim();
  const expectedMigration = (environment.TABLESYNC_EXPECTED_MIGRATION ?? "").trim();
  const managedDeployment = DEPLOYED_ENVIRONMENTS.has(deploymentEnvironment);
  const issues: string[] = [];

  if (environment.TABLESYNC_DEPLOYMENT_ENV && !["local", "ci", "staging", "production"].includes(deploymentEnvironment)) {
    issues.push("TABLESYNC_DEPLOYMENT_ENV must be local, ci, staging, or production.");
  }
  if (managedDeployment) {
    if (!deploymentId || deploymentId === "local") {
      issues.push("TABLESYNC_DEPLOYMENT_ID is required for deployed environments.");
    }
    if (!/^[a-f0-9]{7,64}$/i.test(commitSha)) {
      issues.push("TABLESYNC_GIT_SHA must contain the deployed commit SHA.");
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

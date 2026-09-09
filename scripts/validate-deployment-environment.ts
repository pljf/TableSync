import "dotenv/config";
import { authEnvironment, isLocalTestAuthEnabled } from "../src/lib/auth-environment";
import { inspectDatabaseEnvironment } from "../src/lib/database-environment";
import { inspectDeploymentEnvironment } from "../src/lib/deployment-environment";

const database = inspectDatabaseEnvironment();
const deployment = inspectDeploymentEnvironment();
const issues = [...deployment.issues, ...database.issues, ...authEnvironment.issues];

if (!deployment.managedDeployment) {
  issues.push("TABLESYNC_DEPLOYMENT_ENV must be staging or production for this gate.");
}
if (database.databaseScope !== "acceptance") {
  issues.push("TABLESYNC_DATABASE_SCOPE must be acceptance for the deployment gate.");
}
if (isLocalTestAuthEnabled() || process.env.TABLESYNC_E2E_AUTH || process.env.TABLESYNC_E2E_AUTH_KEY) {
  issues.push("Local E2E authentication variables must not exist in a deployed environment.");
}

if (issues.length > 0) {
  console.error("Deployment environment validation failed:");
  for (const issue of [...new Set(issues)]) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: "ready",
        environment: deployment.deploymentEnvironment,
        deploymentId: deployment.deploymentId,
        commitSha: deployment.commitSha,
        expectedMigration: deployment.expectedMigration,
        authentication: authEnvironment.githubConfigured ? "guest-and-github" : "guest-only",
        database: {
          directConnection: "configured",
          pooledRuntimeConnection: "configured",
          poolMaxUses: database.poolMaxUses,
          poolSize: database.poolSize,
          separateRoles: database.runtime?.username !== database.direct?.username,
          tlsRequired: true
        }
      },
      null,
      2
    )
  );
}

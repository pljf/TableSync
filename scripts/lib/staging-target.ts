import { isIP } from "node:net";
import { inspectDeploymentEnvironment } from "../../src/lib/deployment-environment";

type Environment = Record<string, string | undefined>;
type TargetVariable = "TABLESYNC_E2E_BASE_URL" | "TABLESYNC_LIGHTHOUSE_BASE_URL";

function parseStagingOrigin(value: string | undefined, name: string): URL {
  const raw = value?.trim();
  if (!raw) throw new Error(`${name} is required for remote acceptance.`);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid HTTPS deployment origin.`);
  }
  // Validate the supplied form too: URL parsing normalizes dot paths, empty
  // query strings, and backslashes that do not belong in a deployment origin.
  if (!/^https:\/\/[^/?#\\@]+\/?$/i.test(raw) || url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${name} must be an HTTPS origin without credentials, a path, query, or fragment.`);
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  // Use deployment DNS names so numeric aliases cannot disguise loopback URLs.
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
      isIP(hostname.replace(/^\[|\]$/g, ""))) {
    throw new Error(`${name} must use a non-local deployment hostname.`);
  }
  return url;
}

export function validateStagingTarget(environment: Environment, targetVariable: TargetVariable) {
  const baseUrl = parseStagingOrigin(environment[targetVariable], targetVariable);
  const authUrl = parseStagingOrigin(environment.BETTER_AUTH_URL, "BETTER_AUTH_URL");
  const appUrl = parseStagingOrigin(environment.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL");
  if (baseUrl.origin !== authUrl.origin || baseUrl.origin !== appUrl.origin) {
    throw new Error(`${targetVariable} must match both BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL origins before using a staging session.`);
  }
  const deployment = inspectDeploymentEnvironment(environment);
  const issues = [...deployment.issues];
  if (deployment.deploymentEnvironment !== "staging") {
    issues.push("TABLESYNC_DEPLOYMENT_ENV must be staging for remote acceptance.");
  }
  if (environment.TABLESYNC_E2E_AUTH || environment.TABLESYNC_E2E_AUTH_KEY) {
    issues.push("Local test authentication must not be configured for staging E2E or audits.");
  }
  if (issues.length > 0) throw new Error(`Staging target validation failed: ${[...new Set(issues)].join(" ")}`);
  return { baseUrl, deployment };
}

export function validateStagingHealth(body: unknown, deployment: ReturnType<typeof inspectDeploymentEnvironment>) {
  const health = body && typeof body === "object" ? body as Record<string, unknown> : null;
  if (health?.status !== "ready") throw new Error("Staging health gate did not report readiness.");
  if (
    health.environment !== "staging" ||
    health.deploymentId !== deployment.deploymentId ||
    health.commitSha !== deployment.commitSha ||
    health.migration !== deployment.expectedMigration
  ) {
    throw new Error("Staging health attribution does not match the reviewed deployment environment.");
  }
}

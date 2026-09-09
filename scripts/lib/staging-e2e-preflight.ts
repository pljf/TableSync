import { inspectDatabaseEnvironment } from "../../src/lib/database-environment";
import { validateStagingTarget } from "./staging-target";

type Environment = Record<string, string | undefined>;

export function validateStagingE2EEnvironment(environment: Environment) {
  const { baseUrl, deployment } = validateStagingTarget(environment, "TABLESYNC_E2E_BASE_URL");
  const database = inspectDatabaseEnvironment(environment);
  const issues = [...database.issues];
  if (database.databaseScope !== "acceptance") {
    issues.push("TABLESYNC_DATABASE_SCOPE must be acceptance before running staging E2E or cleanup.");
  }
  if (issues.length > 0) throw new Error(`Staging E2E environment validation failed: ${[...new Set(issues)].join(" ")}`);

  const sessionCookie = environment.TABLESYNC_STAGING_SESSION_COOKIE?.trim();
  const sessionCookieName = environment.TABLESYNC_STAGING_SESSION_COOKIE_NAME?.trim() || "__Secure-tablesync-auth.session_token";
  if (!sessionCookie) throw new Error("TABLESYNC_STAGING_SESSION_COOKIE is required and must be supplied as a CI secret.");
  if (!/^(?:__Secure-)?tablesync-auth\.session_token$/.test(sessionCookieName)) {
    throw new Error("TABLESYNC_STAGING_SESSION_COOKIE_NAME is not an approved TableSync session cookie.");
  }

  return { baseUrl, deployment, sessionCookie, sessionCookieName };
}

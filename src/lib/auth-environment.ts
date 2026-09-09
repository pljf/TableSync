import { randomBytes, timingSafeEqual } from "node:crypto";
import { isManagedDeployment } from "@/lib/deployment-environment";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const PLACEHOLDER_VALUE = /replace|example|changeme|placeholder/i;
// Read the server's runtime value. Direct NEXT_PUBLIC_* access is replaced at
// build time by Next, which can differ from a subsequently configured origin.
const configuredAuthUrl = process.env.BETTER_AUTH_URL?.trim();
const configuredAppUrl = (Reflect.get(process.env, "NEXT_PUBLIC_APP_URL") as string | undefined)?.trim();
const configuredBaseUrl = configuredAuthUrl || configuredAppUrl || "http://localhost:3000";
const isManagedRuntime = isManagedDeployment();

function parseOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash
    ) ? url : null;
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  const normalized = hostname.replace(/\.$/, "");
  return LOCAL_HOSTS.has(normalized) || normalized.endsWith(".localhost") || /^127\./.test(normalized);
}

function configuredSecret(): string | undefined {
  const value = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!value || value.trim().length < 32 || PLACEHOLDER_VALUE.test(value)) {
    return undefined;
  }
  return value;
}

function inspectConfiguredOrigins(baseUrl: URL): { origins: string[]; valid: boolean } {
  const configured = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed = configured.map((value) => parseOrigin(value));
  const valid = parsed.every(
    (url) => url && (!isManagedRuntime || (url.protocol === "https:" && !isLocalHost(url.hostname)))
  );
  return {
    origins: [...new Set([baseUrl.origin, ...parsed.filter((url): url is URL => Boolean(url)).map((url) => url.origin)])],
    valid
  };
}

const configuredBaseUrlParsed = parseOrigin(configuredBaseUrl);
const parsedAuthUrl = configuredAuthUrl ? parseOrigin(configuredAuthUrl) : null;
const parsedAppUrl = configuredAppUrl ? parseOrigin(configuredAppUrl) : null;
const canonicalUrlsValid = Boolean(
  configuredBaseUrlParsed &&
  (!configuredAuthUrl || parsedAuthUrl) &&
  (!configuredAppUrl || parsedAppUrl) &&
  (!parsedAuthUrl || !parsedAppUrl || parsedAuthUrl.origin === parsedAppUrl.origin) &&
  (!isManagedRuntime || (parsedAuthUrl && parsedAppUrl))
);
const parsedBaseUrl = configuredBaseUrlParsed ?? new URL("http://localhost:3000");
const secret = configuredSecret();
const githubId = process.env.AUTH_GITHUB_ID?.trim();
const githubSecret = process.env.AUTH_GITHUB_SECRET?.trim();
const githubConfigured = Boolean(
  githubId && githubSecret && !PLACEHOLDER_VALUE.test(githubId) && !PLACEHOLDER_VALUE.test(githubSecret)
);
const githubConfigurationValid = (!githubId && !githubSecret) || githubConfigured;
const localBaseUrl = isLocalHost(parsedBaseUrl.hostname);
const secureBaseUrl = isManagedRuntime
  ? parsedBaseUrl.protocol === "https:" && !localBaseUrl
  : parsedBaseUrl.protocol === "https:" || localBaseUrl;
const trustedOrigins = inspectConfiguredOrigins(parsedBaseUrl);
const localDevelopmentSession = !isManagedRuntime && localBaseUrl;
const issues: string[] = [];
if (!canonicalUrlsValid) {
  issues.push("BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must use the same canonical origin, without credentials, paths, queries, or fragments; both are required when deployed.");
}
if (!secureBaseUrl) {
  issues.push("Authentication requires a non-local HTTPS origin when deployed.");
}
if (!secret && !localDevelopmentSession) {
  issues.push("BETTER_AUTH_SECRET must contain at least 32 non-placeholder characters when deployed.");
}
if (!trustedOrigins.valid) {
  issues.push("AUTH_TRUSTED_ORIGINS must contain valid origins, using non-local HTTPS when deployed.");
}
if (!githubConfigurationValid) {
  issues.push("GitHub sign-in requires both AUTH_GITHUB_ID and AUTH_GITHUB_SECRET with non-placeholder values, or both must be empty for guest-only access.");
}
const sessionReady = issues.length === 0;
const globalForAuth = globalThis as unknown as { tablesyncLocalAuthSecret?: string };
const fallbackSecret =
  globalForAuth.tablesyncLocalAuthSecret ?? (globalForAuth.tablesyncLocalAuthSecret = randomBytes(48).toString("base64url"));

export const authEnvironment = {
  baseUrl: parsedBaseUrl.origin,
  origin: parsedBaseUrl.origin,
  trustedOrigins: trustedOrigins.origins,
  secureCookies: parsedBaseUrl.protocol === "https:",
  secret: secret ?? fallbackSecret,
  secretConfigured: Boolean(secret),
  githubId,
  githubSecret,
  githubConfigured,
  issues,
  sessionReady,
  // Existing sign-in controls use this stricter condition to enable GitHub.
  productionReady: Boolean(sessionReady && secret && githubConfigured)
} as const;

export function isLocalTestAuthEnabled(): boolean {
  const key = process.env.TABLESYNC_E2E_AUTH_KEY;
  return (
    process.env.TABLESYNC_E2E_AUTH === "1" &&
    process.env.CI === "1" &&
    typeof key === "string" &&
    key.length >= 32 &&
    LOCAL_HOSTS.has(parsedBaseUrl.hostname) &&
    !isManagedRuntime
  );
}

export function testAuthKeyMatches(candidate: string | null): boolean {
  const expected = process.env.TABLESYNC_E2E_AUTH_KEY;
  if (!isLocalTestAuthEnabled() || !candidate || !expected || candidate.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

import { randomBytes, timingSafeEqual } from "node:crypto";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const configuredBaseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const isManagedRuntime = Boolean(
  process.env.VERCEL ||
    process.env.CF_PAGES ||
    ["staging", "production"].includes((process.env.TABLESYNC_DEPLOYMENT_ENV ?? "").toLowerCase())
);

function parseBaseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function configuredSecret(): string | undefined {
  const value = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!value || value.length < 32 || /replace|example|changeme/i.test(value)) {
    return undefined;
  }
  return value;
}

function inspectConfiguredOrigins(baseUrl: URL): { origins: string[]; valid: boolean } {
  const configured = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed = configured.map((value) => parseBaseUrl(value));
  const valid = parsed.every(
    (url) => url && (!isManagedRuntime || (url.protocol === "https:" && !LOCAL_HOSTS.has(url.hostname)))
  );
  return {
    origins: [...new Set([baseUrl.origin, ...parsed.filter((url): url is URL => Boolean(url)).map((url) => url.origin)])],
    valid
  };
}

const configuredBaseUrlParsed = parseBaseUrl(configuredBaseUrl);
const parsedBaseUrl = configuredBaseUrlParsed ?? new URL("http://localhost:3000");
const secret = configuredSecret();
const githubId = process.env.AUTH_GITHUB_ID?.trim();
const githubSecret = process.env.AUTH_GITHUB_SECRET?.trim();
const githubConfigured = Boolean(
  githubId && githubSecret && !/replace|example|changeme/i.test(githubId) && !/replace|example|changeme/i.test(githubSecret)
);
const localBaseUrl = LOCAL_HOSTS.has(parsedBaseUrl.hostname);
const secureBaseUrl = isManagedRuntime
  ? parsedBaseUrl.protocol === "https:" && !localBaseUrl
  : parsedBaseUrl.protocol === "https:" || localBaseUrl;
const trustedOrigins = inspectConfiguredOrigins(parsedBaseUrl);

export const authEnvironment = {
  baseUrl: parsedBaseUrl.toString().replace(/\/$/, ""),
  origin: parsedBaseUrl.origin,
  trustedOrigins: trustedOrigins.origins,
  secureCookies: parsedBaseUrl.protocol === "https:",
  secret: secret ?? randomBytes(48).toString("base64url"),
  secretConfigured: Boolean(secret),
  githubId,
  githubSecret,
  githubConfigured,
  productionReady: Boolean(
    configuredBaseUrlParsed && secret && githubConfigured && secureBaseUrl && trustedOrigins.valid
  )
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

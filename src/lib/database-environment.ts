const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const DEPLOYED_ENVIRONMENTS = new Set(["staging", "production"]);
const REQUIRED_TLS_MODES = new Set(["require", "verify-ca", "verify-full"]);

type Environment = NodeJS.ProcessEnv | Record<string, string | undefined>;

type ParsedDatabaseUrl = {
  database: string;
  hostname: string;
  password: string;
  raw: string;
  sslMode: string;
  username: string;
};

export type DatabaseEnvironmentInspection = {
  databaseScope: string;
  deploymentEnvironment: string;
  direct: ParsedDatabaseUrl | null;
  issues: string[];
  managedDeployment: boolean;
  poolMaxUses: number | null;
  poolSize: number;
  ready: boolean;
  runtime: ParsedDatabaseUrl | null;
};

function parseDatabaseUrl(value: string | undefined): ParsedDatabaseUrl | null {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return null;
    return {
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      hostname: url.hostname.toLowerCase(),
      password: decodeURIComponent(url.password),
      raw,
      sslMode: (url.searchParams.get("sslmode") ?? "").toLowerCase(),
      username: decodeURIComponent(url.username)
    };
  } catch {
    return null;
  }
}

function integerSetting(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function isManagedDatabaseDeployment(environment: Environment = process.env): boolean {
  return DEPLOYED_ENVIRONMENTS.has((environment.TABLESYNC_DEPLOYMENT_ENV ?? "").trim().toLowerCase());
}

export function inspectDatabaseEnvironment(
  environment: Environment = process.env
): DatabaseEnvironmentInspection {
  const deploymentEnvironment = (environment.TABLESYNC_DEPLOYMENT_ENV ?? "local").trim().toLowerCase();
  const managedDeployment = DEPLOYED_ENVIRONMENTS.has(deploymentEnvironment);
  const databaseScope = (environment.TABLESYNC_DATABASE_SCOPE ?? (managedDeployment ? "" : "local"))
    .trim()
    .toLowerCase();
  const runtime = parseDatabaseUrl(environment.DATABASE_URL);
  const direct = parseDatabaseUrl(environment.DIRECT_URL);
  const poolSize = integerSetting(environment.DATABASE_POOL_SIZE, 10);
  const configuredMaxUses = environment.DATABASE_POOL_MAX_USES?.trim();
  const poolMaxUses = configuredMaxUses ? integerSetting(configuredMaxUses, 0) : null;
  const issues: string[] = [];

  if (!runtime) issues.push("DATABASE_URL must be a valid PostgreSQL URL.");
  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 20) {
    issues.push("DATABASE_POOL_SIZE must be an integer from 1 through 20.");
  }

  if (managedDeployment) {
    if (!["runtime", "acceptance"].includes(databaseScope)) {
      issues.push("TABLESYNC_DATABASE_SCOPE must be runtime or acceptance in a deployed environment.");
    }
    if (databaseScope === "runtime" && environment.DIRECT_URL?.trim()) {
      issues.push("DIRECT_URL must not be exposed to the application runtime process.");
    }
    if (databaseScope === "acceptance" && !direct) {
      issues.push("DIRECT_URL must be a valid PostgreSQL URL in the protected acceptance job.");
    }
    if (environment.DATABASE_RUNTIME_MODE !== "pooled") {
      issues.push("DATABASE_RUNTIME_MODE must explicitly be set to pooled.");
    }
    if (poolMaxUses === null || !Number.isInteger(poolMaxUses) || poolMaxUses < 100 || poolMaxUses > 100_000) {
      issues.push("DATABASE_POOL_MAX_USES must be an integer from 100 through 100000.");
    }

    const connections: ReadonlyArray<readonly [string, ParsedDatabaseUrl | null]> = [
      ["DATABASE_URL", runtime],
      ...(databaseScope === "acceptance" ? [["DIRECT_URL", direct] as const] : [])
    ];
    for (const [label, parsed] of connections) {
      if (!parsed) continue;
      if (LOCAL_DATABASE_HOSTS.has(parsed.hostname)) {
        issues.push(`${label} must not target a local host in a deployed environment.`);
      }
      if (!REQUIRED_TLS_MODES.has(parsed.sslMode)) {
        issues.push(`${label} must explicitly require TLS with sslmode=require, verify-ca, or verify-full.`);
      }
      if (!parsed.username || !parsed.password) {
        issues.push(`${label} must use an explicit database role and credential.`);
      }
    }

    if (databaseScope === "acceptance" && runtime && direct) {
      if (runtime.raw === direct.raw) {
        issues.push("DATABASE_URL and DIRECT_URL must be distinct pooled and direct connections.");
      }
      if (runtime.username === direct.username) {
        issues.push("Runtime and migration connections must use distinct least-privilege roles.");
      }
      if (runtime.database !== direct.database) {
        issues.push("Runtime and migration connections must target the same staging database.");
      }
    }
  }

  return {
    databaseScope,
    deploymentEnvironment,
    direct,
    issues,
    managedDeployment,
    poolMaxUses,
    poolSize,
    ready: issues.length === 0,
    runtime
  };
}

export function assertRuntimeDatabaseEnvironment(environment: Environment = process.env): void {
  if (!isManagedDatabaseDeployment(environment)) return;
  const inspection = inspectDatabaseEnvironment(environment);
  if (!inspection.ready) {
    throw new Error(`Unsafe deployed database configuration: ${inspection.issues.join(" ")}`);
  }
}

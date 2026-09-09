import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { inspectDatabaseEnvironment } from "../src/lib/database-environment";

type RoleProbe = {
  allApplicationCrud: boolean;
  anyDangerousTableGrant: boolean;
  canCreateInDatabase: boolean;
  canCreateInPublic: boolean;
  ownsApplicationTables: number;
  role: string;
  rolbypassrls: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolreplication: boolean;
  rolsuper: boolean;
  ssl: boolean;
};

function roleFingerprint(role: string): string {
  return createHash("sha256").update(role).digest("hex").slice(0, 12);
}

async function probe(connectionString: string): Promise<RoleProbe> {
  const client = new Client({ connectionString, application_name: "tablesync-security-verifier" });
  await client.connect();
  try {
    const result = await client.query<RoleProbe>(`
      SELECT
        current_user AS "role",
        COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS "ssl",
        role.rolsuper AS "rolsuper",
        role.rolcreaterole AS "rolcreaterole",
        role.rolcreatedb AS "rolcreatedb",
        role.rolreplication AS "rolreplication",
        role.rolbypassrls AS "rolbypassrls",
        has_database_privilege(current_user, current_database(), 'CREATE') AS "canCreateInDatabase",
        has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreateInPublic",
        (
          SELECT COUNT(*)::integer
          FROM pg_class relation
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relkind IN ('r', 'p')
            AND relation.relname <> '_prisma_migrations'
            AND relation.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
        ) AS "ownsApplicationTables",
        COALESCE((
          SELECT bool_and(has_table_privilege(
            current_user,
            format('%I.%I', namespace.nspname, relation.relname),
            'SELECT, INSERT, UPDATE, DELETE'
          ))
          FROM pg_class relation
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relkind IN ('r', 'p')
            AND relation.relname <> '_prisma_migrations'
        ), false) AS "allApplicationCrud",
        COALESCE((
          SELECT bool_or(
            has_table_privilege(current_user, format('%I.%I', namespace.nspname, relation.relname), 'TRUNCATE')
            OR has_table_privilege(current_user, format('%I.%I', namespace.nspname, relation.relname), 'TRIGGER')
          )
          FROM pg_class relation
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relkind IN ('r', 'p')
            AND relation.relname <> '_prisma_migrations'
        ), false) AS "anyDangerousTableGrant"
      FROM pg_roles role
      WHERE role.rolname = current_user
    `);
    if (!result.rows[0]) throw new Error("Database role probe returned no result.");
    return result.rows[0];
  } finally {
    await client.end();
  }
}

const environment = inspectDatabaseEnvironment();
if (
  !environment.managedDeployment ||
  environment.databaseScope !== "acceptance" ||
  !environment.ready ||
  !environment.runtime ||
  !environment.direct
) {
  console.error("Managed database environment validation must pass before role verification.");
  for (const issue of environment.issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  const [runtime, migration] = await Promise.all([
    probe(environment.runtime.raw),
    probe(environment.direct.raw)
  ]);
  const runtimeSafe =
    runtime.ssl &&
    !runtime.rolsuper &&
    !runtime.rolcreaterole &&
    !runtime.rolcreatedb &&
    !runtime.rolreplication &&
    !runtime.rolbypassrls &&
    !runtime.canCreateInDatabase &&
    !runtime.canCreateInPublic &&
    runtime.ownsApplicationTables === 0 &&
    runtime.allApplicationCrud &&
    !runtime.anyDangerousTableGrant;
  const migrationSafe =
    migration.ssl &&
    !migration.rolsuper &&
    !migration.rolcreaterole &&
    !migration.rolcreatedb &&
    !migration.rolreplication &&
    !migration.rolbypassrls &&
    (migration.canCreateInDatabase || migration.canCreateInPublic);
  const rolesDistinct = runtime.role !== migration.role;
  const report = {
    checkedAt: new Date().toISOString(),
    environment: environment.deploymentEnvironment,
    status: runtimeSafe && migrationSafe && rolesDistinct ? "passed" : "failed",
    rolesDistinct,
    runtime: {
      fingerprint: roleFingerprint(runtime.role),
      tls: runtime.ssl,
      noElevatedRoleAttributes:
        !runtime.rolsuper &&
        !runtime.rolcreaterole &&
        !runtime.rolcreatedb &&
        !runtime.rolreplication &&
        !runtime.rolbypassrls,
      cannotCreateDatabaseObjects: !runtime.canCreateInDatabase && !runtime.canCreateInPublic,
      ownsApplicationTables: runtime.ownsApplicationTables,
      applicationCrud: runtime.allApplicationCrud,
      dangerousTableGrants: runtime.anyDangerousTableGrant
    },
    migration: {
      fingerprint: roleFingerprint(migration.role),
      tls: migration.ssl,
      noElevatedRoleAttributes:
        !migration.rolsuper &&
        !migration.rolcreaterole &&
        !migration.rolcreatedb &&
        !migration.rolreplication &&
        !migration.rolbypassrls,
      canApplyMigrations: migration.canCreateInDatabase || migration.canCreateInPublic
    }
  };

  const outputFlag = process.argv.indexOf("--output");
  if (outputFlag >= 0) {
    const requestedPath = process.argv[outputFlag + 1];
    if (!requestedPath) throw new Error("--output requires a path inside the workspace.");
    const outputPath = resolve(requestedPath);
    const workspaceRoot = resolve(process.cwd());
    if (!outputPath.startsWith(`${workspaceRoot}\\`) && outputPath !== workspaceRoot) {
      throw new Error("Database evidence output must stay inside the workspace.");
    }
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "passed") process.exitCode = 1;
}

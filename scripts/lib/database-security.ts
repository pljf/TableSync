import { createHash } from "node:crypto";

export type RoleProbe = {
  allApplicationCrud: boolean;
  anyDangerousTableGrant: boolean;
  backendSsl: boolean;
  canCreateInDatabase: boolean;
  canCreateInPublic: boolean;
  canUsePublic: boolean;
  canReadMigrations: boolean;
  ownsApplicationTables: number;
  role: string;
  rolbypassrls: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolreplication: boolean;
  rolsuper: boolean;
  // Verified TLS on the client socket; the PostgreSQL backend may sit behind a proxy.
  ssl: boolean;
};

// PostgreSQL interprets a comma-separated privilege list as ANY, not ALL.
export const applicationCrudCheckSql = ["SELECT", "INSERT", "UPDATE", "DELETE"]
  .map((privilege) => `has_table_privilege(current_user, relation.oid, '${privilege}')`)
  .join(" AND ");

export const databaseRoleProbeSql = `
  SELECT
    current_user AS "role",
    COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS "backendSsl",
    role.rolsuper AS "rolsuper",
    role.rolcreaterole AS "rolcreaterole",
    role.rolcreatedb AS "rolcreatedb",
    role.rolreplication AS "rolreplication",
    role.rolbypassrls AS "rolbypassrls",
    has_database_privilege(current_user, current_database(), 'CREATE') AS "canCreateInDatabase",
    has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreateInPublic",
    has_schema_privilege(current_user, 'public', 'USAGE') AS "canUsePublic",
    COALESCE(has_table_privilege(current_user, to_regclass('public._prisma_migrations'), 'SELECT'), false)
      AS "canReadMigrations",
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
      SELECT bool_and(${applicationCrudCheckSql})
      FROM pg_class relation
      JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relkind IN ('r', 'p')
        AND relation.relname <> '_prisma_migrations'
    ), false) AS "allApplicationCrud",
    COALESCE((
      SELECT bool_or(
        has_table_privilege(current_user, relation.oid, 'TRUNCATE')
        OR has_table_privilege(current_user, relation.oid, 'TRIGGER')
      )
      FROM pg_class relation
      JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relkind IN ('r', 'p')
        AND relation.relname <> '_prisma_migrations'
    ), false) AS "anyDangerousTableGrant"
  FROM pg_roles role
  WHERE role.rolname = current_user
`;

function roleFingerprint(role: string): string {
  return createHash("sha256").update(role).digest("hex").slice(0, 12);
}

function noElevatedRoleAttributes(role: RoleProbe): boolean {
  return !role.rolsuper && !role.rolcreaterole && !role.rolcreatedb && !role.rolreplication && !role.rolbypassrls;
}

export function databaseSecurityReport(runtime: RoleProbe, migration: RoleProbe, environment: string) {
  const runtimeSafe = runtime.ssl && noElevatedRoleAttributes(runtime) &&
    !runtime.canCreateInDatabase && !runtime.canCreateInPublic && runtime.canUsePublic &&
    runtime.ownsApplicationTables === 0 && runtime.allApplicationCrud &&
    runtime.canReadMigrations && !runtime.anyDangerousTableGrant;
  const migrationSafe = migration.ssl && noElevatedRoleAttributes(migration) && migration.canCreateInPublic && migration.canUsePublic;
  const rolesDistinct = runtime.role !== migration.role;

  return {
    checkedAt: new Date().toISOString(),
    environment,
    status: runtimeSafe && migrationSafe && rolesDistinct ? "passed" : "failed",
    rolesDistinct,
    runtime: {
      fingerprint: roleFingerprint(runtime.role),
      tls: runtime.ssl,
      backendTls: runtime.backendSsl,
      noElevatedRoleAttributes: noElevatedRoleAttributes(runtime),
      cannotCreateDatabaseObjects: !runtime.canCreateInDatabase && !runtime.canCreateInPublic,
      applicationSchemaAccessible: runtime.canUsePublic,
      ownsApplicationTables: runtime.ownsApplicationTables,
      applicationCrud: runtime.allApplicationCrud,
      migrationHistoryReadable: runtime.canReadMigrations,
      dangerousTableGrants: runtime.anyDangerousTableGrant
    },
    migration: {
      fingerprint: roleFingerprint(migration.role),
      tls: migration.ssl,
      backendTls: migration.backendSsl,
      noElevatedRoleAttributes: noElevatedRoleAttributes(migration),
      applicationSchemaAccessible: migration.canUsePublic,
      canApplyMigrations: migration.canCreateInPublic && migration.canUsePublic
    }
  };
}

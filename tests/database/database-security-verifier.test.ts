import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";
import { isManagedDeployment } from "@/lib/deployment-environment";
import { applicationCrudCheckSql } from "../../scripts/lib/database-security";

// This regression needs a disposable local/CI administrator. The entire role,
// temporary table and grants are rolled back; managed application roles never run it.
it.skipIf(isManagedDeployment())("requires every CRUD privilege in the actual PostgreSQL security probe", async (context) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
  const role = `tablesync_probe_${randomUUID().replaceAll("-", "")}`;
  try {
    await client.connect();
    await client.query("BEGIN");
    const current = await client.query<{ superuser: boolean }>("SELECT rolsuper AS superuser FROM pg_roles WHERE rolname = current_user");
    if (!current.rows[0]?.superuser) context.skip("This isolated role regression requires the local/CI administrator.");
    await client.query(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    await client.query("CREATE TEMPORARY TABLE tablesync_privilege_probe (id integer) ON COMMIT DROP");
    const table = await client.query<{ oid: number }>("SELECT 'pg_temp.tablesync_privilege_probe'::regclass::oid AS oid");
    const tableOid = table.rows[0].oid;
    const probe = async () => {
      await client.query(`SET LOCAL ROLE "${role}"`);
      try {
        const result = await client.query<{ hasAll: boolean }>(
          `SELECT ${applicationCrudCheckSql} AS "hasAll" FROM pg_class relation WHERE relation.oid = $1::oid`,
          [tableOid]
        );
        return result.rows[0].hasAll;
      } finally {
        await client.query("RESET ROLE");
      }
    };

    await client.query(`GRANT SELECT ON pg_temp.tablesync_privilege_probe TO "${role}"`);
    expect(await probe(), "SELECT alone must not satisfy full CRUD").toBe(false);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON pg_temp.tablesync_privilege_probe TO "${role}"`);
    expect(await probe(), "all four privileges must pass").toBe(true);
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      await client.query(`REVOKE ${privilege} ON pg_temp.tablesync_privilege_probe FROM "${role}"`);
      expect(await probe(), `missing ${privilege} must fail`).toBe(false);
      await client.query(`GRANT ${privilege} ON pg_temp.tablesync_privilege_probe TO "${role}"`);
    }
    expect(await probe(), "restored full CRUD must pass").toBe(true);
  } finally {
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  }
});

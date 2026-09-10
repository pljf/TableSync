import "dotenv/config";
import { Client } from "pg";
import { inspectDatabaseEnvironment } from "../src/lib/database-environment";
import { databaseRoleProbeSql, databaseSecurityReport, type RoleProbe } from "./lib/database-security";
import { verifiedClientTls, verifiedDatabaseConnectionString } from "./lib/database-tls";
import { resolveEvidencePath, writeEvidenceFile } from "./lib/evidence-output";

async function probe(connectionString: string): Promise<RoleProbe> {
  const client = new Client({
    connectionString: verifiedDatabaseConnectionString(connectionString),
    application_name: "tablesync-security-verifier",
    connectionTimeoutMillis: 10_000,
    query_timeout: 15_000
  });
  // Pooler/network errors can occur between queries; do not let an unhandled
  // EventEmitter error expose connection details or role names.
  let disconnected = false;
  client.on("error", () => { disconnected = true; });
  try {
    await client.connect();
    const result = await client.query<Omit<RoleProbe, "ssl">>(databaseRoleProbeSql);
    if (disconnected || !result.rows[0]) throw new Error("Database role probe did not complete.");
    return { ...result.rows[0], ssl: verifiedClientTls(client.connection.stream) };
  } finally {
    await client.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const requestedPath = args.length === 2 && args[0] === "--output" ? args[1] : undefined;
  if (args.length && !requestedPath) {
    throw new Error("Expected --output followed by an evidence path.");
  }
  if (requestedPath) resolveEvidencePath(process.cwd(), requestedPath);

  const environment = inspectDatabaseEnvironment();
  if (!environment.managedDeployment || environment.databaseScope !== "acceptance" ||
      !environment.ready || !environment.runtime || !environment.direct) {
    console.error("Managed database environment validation must pass before role verification.");
    for (const issue of environment.issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }

  const [runtime, migration] = await Promise.all([
    probe(environment.runtime.raw),
    probe(environment.direct.raw)
  ]);
  const report = databaseSecurityReport(runtime, migration, environment.deploymentEnvironment);
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (requestedPath) await writeEvidenceFile(process.cwd(), requestedPath, output);
  console.log(output.trimEnd());
  if (report.status !== "passed") process.exitCode = 1;
}

main().catch(() => {
  // Driver and filesystem errors may include passwords, URLs, role names or
  // caller-supplied paths. Report failure without serializing the original error.
  console.error("Database security verification failed. Check the protected connection settings and evidence destination.");
  process.exitCode = 1;
});

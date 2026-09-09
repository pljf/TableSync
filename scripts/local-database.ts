import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PGLiteSocketHandler } from "@electric-sql/pglite-socket";
import { installPgliteSocketLifecycleFix } from "./lib/pglite-socket-lifecycle";

const name = "tablesync";
const require = createRequire(import.meta.url);
const runtimeEntry = require.resolve("@prisma/dev");
const socketEntry = require.resolve("@electric-sql/pglite-socket");
const runtimeRequire = createRequire(runtimeEntry);
const versionAt = (entry: string) => JSON.parse(
  readFileSync(join(dirname(entry), "..", "package.json"), "utf8"),
).version as string;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This database launcher is for local development and testing only.");
  }
  if (versionAt(runtimeEntry) !== "0.24.17" || runtimeRequire.resolve("@electric-sql/pglite-socket") !== socketEntry) {
    throw new Error("Review the local database launcher after changing its pinned workspace dependencies.");
  }
  installPgliteSocketLifecycleFix(PGLiteSocketHandler, versionAt(socketEntry));

  // These exported state APIs let us retain the named instance and its ports.
  const { getServerStatus, killServer, ServerState } = await import("@prisma/dev/internal/state");
  const command = process.argv[2] ?? "start";
  if (!["start", "stop", "status"].includes(command) || process.argv.length > 3) {
    throw new Error("Usage: npm run db:dev -- [start|stop|status]");
  }
  if (command === "status") {
    const status = await getServerStatus(name);
    console.log(JSON.stringify({ name, status: status.status, pid: status.pid, port: status.databasePort }));
    return;
  }
  if (command === "stop") {
    const status = await getServerStatus(name);
    if (status.status !== "running" && status.status !== "starting_up") {
      console.log("The local tablesync database is already stopped.");
      return;
    }
    if (!await killServer(status)) throw new Error("Could not stop the local tablesync database.");
    console.log("Stopped the local tablesync database; its saved data is preserved.");
    return;
  }

  const previous = await ServerState.fromServerDump({ name });
  const { startPrismaDevServer } = await import("@prisma/dev");
  const server = await startPrismaDevServer({
    name,
    persistenceMode: "stateful",
    ...(previous ? {
      port: previous.port,
      databasePort: previous.databasePort,
      shadowDatabasePort: previous.shadowDatabasePort,
      streamsPort: previous.experimental?.streams
        ? Number(new URL(previous.experimental.streams.serverUrl).port)
        : undefined,
    } : {}),
  });
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try {
      await server.close();
      process.exitCode = 0;
    } catch {
      console.error("The local database could not finish shutting down cleanly.");
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  console.log(`Local tablesync database ready on port ${new URL(server.database.connectionString).port} (PID ${process.pid}).`);
  console.log("Keep this terminal open. Stop with Ctrl+C or npm run db:dev -- stop. Existing data is preserved.");
}

main().catch((error: unknown) => {
  // Runtime error objects can contain connection strings. Keep terminal output safe.
  const message = error instanceof Error ? error.message : "Unknown local database error";
  console.error(message.replace(/(?:postgres(?:ql)?|prisma\+postgres):\/\/[^\s]+/gi, "[database URL redacted]"));
  process.exitCode = 1;
});

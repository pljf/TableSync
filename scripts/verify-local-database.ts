import "dotenv/config";
import assert from "node:assert/strict";
import { Socket } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import { getServerStatus } from "@prisma/dev/internal/state";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  assert(connectionString, "DATABASE_URL is required.");
  const target = new URL(connectionString);
  const status = await getServerStatus("tablesync");
  assert(process.env.NODE_ENV !== "production", "This check is for a local development database only.");
  assert(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname), "Only loopback databases can be checked.");
  assert(["postgres:", "postgresql:"].includes(target.protocol), "A direct PostgreSQL URL is required.");
  assert(status.status === "running" && Number(target.port) === status.databasePort, "DATABASE_URL must match the running named tablesync development database.");

  // An actual TCP RST reproduces runner/process exits. Every cycle first proves
  // SQL works, then deliberately resets that connection. No app rows are written,
  // no retries hide failures, and the final independent connection must work.
  for (let cycle = 0; cycle < 150; cycle++) {
    const socket = new Socket();
    const client: Client = new Client({
      connectionString,
      stream: () => socket,
      connectionTimeoutMillis: 5_000,
      query_timeout: 5_000,
    });
    let resetting = false;
    const unexpected: Error[] = [];
    client.on("error", (error: Error) => {
      if (!resetting) unexpected.push(error);
    });
    try {
      await client.connect();
      const result = await client.query("SELECT 1 AS healthy");
      assert.equal(result.rows[0].healthy, 1);
      const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()));
      resetting = true;
      socket.resetAndDestroy();
      await closed;
      assert.equal(unexpected.length, 0, "The database failed before the intentional reset.");
    } finally {
      await client.end();
    }
    // Give the peer its normal close/rollback turn before opening the next
    // connection; this is a lifecycle check, not a parallel-load benchmark.
    await delay(5);
  }

  const final = new Client({ connectionString, connectionTimeoutMillis: 5_000, query_timeout: 5_000 });
  try {
    await final.connect();
    const result = await final.query("SELECT 1 AS healthy");
    assert.equal(result.rows[0].healthy, 1);
  } finally {
    await final.end();
  }
  console.log("PASS: 150 real TCP reset cycles and a final independent SQL health check; no application data changed.");
}

main().catch(() => {
  console.error("Local database durability check failed. No retries were attempted; inspect the local database process before running application tests.");
  process.exitCode = 1;
});

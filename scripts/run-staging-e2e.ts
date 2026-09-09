import "dotenv/config";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { validateStagingE2EEnvironment } from "./lib/staging-e2e-preflight";
import { validateStagingHealth } from "./lib/staging-target";

const playwrightCli = "node_modules/@playwright/test/cli.js";
const requestedPlaywrightArgs = process.argv.slice(2);
const e2eRunId = randomUUID();

function waitForExit(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function cleanupE2ERooms() {
  // Recheck before importing a database client: cleanup must never fall back to
  // local credentials or run in the web application's runtime scope.
  validateStagingE2EEnvironment(process.env);
  const { prisma } = await import("../src/lib/prisma");
  try {
    await prisma.dinnerRoom.deleteMany({
      where: { description: `TableSync E2E ${e2eRunId}` }
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const { baseUrl, deployment, sessionCookie, sessionCookieName } = validateStagingE2EEnvironment(process.env);

  const health = await fetch(new URL("/api/health", baseUrl), {
    headers: { "Cache-Control": "no-cache" },
    redirect: "error",
    signal: AbortSignal.timeout(15_000)
  });
  if (!health.ok) throw new Error(`Staging health gate failed with HTTP ${health.status}.`);
  validateStagingHealth(await health.json(), deployment);

  const child = spawn(process.execPath, [playwrightCli, "test", "--reporter=list", ...requestedPlaywrightArgs], {
    env: {
      ...process.env,
      CI: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      PLAYWRIGHT_EXTERNAL_SERVER: "1",
      TABLESYNC_E2E_MODE: "remote",
      TABLESYNC_E2E_BASE_URL: baseUrl.origin,
      TABLESYNC_E2E_RUN_ID: e2eRunId,
      TABLESYNC_DEPLOYMENT_ID: deployment.deploymentId,
      TABLESYNC_GIT_SHA: deployment.commitSha,
      TABLESYNC_EXPECTED_MIGRATION: deployment.expectedMigration,
      TABLESYNC_STAGING_SESSION_COOKIE: sessionCookie,
      TABLESYNC_STAGING_SESSION_COOKIE_NAME: sessionCookieName
    },
    shell: false,
    stdio: "inherit",
    windowsHide: true
  });

  let exitCode = 1;
  try {
    exitCode = await waitForExit(child);
  } finally {
    await cleanupE2ERooms();
  }
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Staging E2E failed.");
  process.exitCode = 1;
});

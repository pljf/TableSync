import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const playwrightCli = "node_modules/@playwright/test/cli.js";
const requestedPlaywrightArgs = process.argv.slice(2);
const e2eRunId = randomUUID();
const baseUrlValue = process.env.TABLESYNC_E2E_BASE_URL?.trim();
const sessionCookie = process.env.TABLESYNC_STAGING_SESSION_COOKIE?.trim();
const sessionCookieName = process.env.TABLESYNC_STAGING_SESSION_COOKIE_NAME?.trim() || "__Secure-tablesync-auth.session_token";

function fail(message: string): never {
  throw new Error(message);
}

function validatedBaseUrl(): URL {
  if (!baseUrlValue) fail("TABLESYNC_E2E_BASE_URL is required.");
  const url = new URL(baseUrlValue);
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    fail("Staging E2E requires a non-local HTTPS URL.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    fail("TABLESYNC_E2E_BASE_URL must be the deployment origin without a path, query, or fragment.");
  }
  return url;
}

function waitForExit(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function cleanupE2ERooms() {
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
  const baseUrl = validatedBaseUrl();
  if (!sessionCookie) fail("TABLESYNC_STAGING_SESSION_COOKIE is required and must be supplied as a CI secret.");
  if (!/^(?:__Secure-)?tablesync-auth\.session_token$/.test(sessionCookieName)) {
    fail("TABLESYNC_STAGING_SESSION_COOKIE_NAME is not an approved TableSync session cookie.");
  }
  if (process.env.TABLESYNC_E2E_AUTH || process.env.TABLESYNC_E2E_AUTH_KEY) {
    fail("Local test authentication must not be configured for staging E2E.");
  }

  const health = await fetch(new URL("/api/health", baseUrl), {
    headers: { "Cache-Control": "no-cache" },
    redirect: "error"
  });
  const healthBody = (await health.json()) as {
    commitSha?: string;
    deploymentId?: string;
    migration?: string;
    status?: string;
  };
  if (!health.ok || healthBody.status !== "ready") {
    fail(`Staging health gate failed with HTTP ${health.status}.`);
  }
  if (
    healthBody.deploymentId !== process.env.TABLESYNC_DEPLOYMENT_ID ||
    healthBody.commitSha !== process.env.TABLESYNC_GIT_SHA ||
    healthBody.migration !== process.env.TABLESYNC_EXPECTED_MIGRATION
  ) {
    fail("Staging health attribution does not match the reviewed deployment environment.");
  }

  const child = spawn(process.execPath, [playwrightCli, "test", "--reporter=list", ...requestedPlaywrightArgs], {
    env: {
      ...process.env,
      CI: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      PLAYWRIGHT_EXTERNAL_SERVER: "1",
      TABLESYNC_E2E_MODE: "remote",
      TABLESYNC_E2E_RUN_ID: e2eRunId,
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

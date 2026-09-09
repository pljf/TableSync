import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const appPort = process.env.TABLESYNC_E2E_PORT ?? "3107";
const appUrl = `http://localhost:${appPort}`;
const nextCli = "node_modules/next/dist/bin/next";
const playwrightCli = "node_modules/@playwright/test/cli.js";
const e2eRunId = randomUUID();
const e2eAuthKey = randomBytes(32).toString("base64url");
const requestedPlaywrightArgs = process.argv.slice(2);

function spawnCommand(command: string, args: string[], inherit = false, extraEnv: Record<string, string> = {}) {
  return spawn(command, args, {
    env: {
      ...process.env,
      ...extraEnv,
      CI: "1",
      NEXT_TELEMETRY_DISABLED: "1"
    },
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true
  });
}

function waitForExit(process: ReturnType<typeof spawnCommand>) {
  return new Promise<number>((resolve) => {
    process.on("exit", (code) => resolve(code ?? 1));
    process.on("error", () => resolve(1));
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    if (await isServerReady()) {
      const health = await fetch(`${appUrl}/api/health`, {
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(10_000)
      });
      const body = await health.json() as { status?: string };
      if (!health.ok || body.status !== "ready") {
        throw new Error("Local E2E readiness failed. Check the database, migrations and authentication environment before running browser tests.");
      }
      return;
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${appUrl}`);
}

async function isServerReady() {
  try {
    const response = await fetch(appUrl, { signal: AbortSignal.timeout(5_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function stopProcess(pid?: number) {
  if (!pid) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  await delay(500);

  try {
    process.kill(pid, 0);
    process.kill(pid, "SIGKILL");
  } catch {
    // The server exited after SIGTERM.
  }
}

async function cleanupE2ERooms() {
  const { prisma } = await import("../src/lib/prisma");
  try {
    await prisma.dinnerRoom.deleteMany({
      where: {
        description: `TableSync E2E ${e2eRunId}`
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  let server: ReturnType<typeof spawnCommand> | null = null;
  let exitCode = 1;

  try {
    if (await isServerReady()) {
      throw new Error(`E2E port ${appPort} is already in use; refusing to test an unattributed server.`);
    }
    if (!existsSync(".next/BUILD_ID")) {
      throw new Error("E2E requires a production build. Run npm run build before npm run test:e2e.");
    }

    server = spawnCommand(process.execPath, [nextCli, "start", "--hostname", "localhost", "--port", appPort], false, {
      TABLESYNC_E2E_RUN_ID: e2eRunId,
      TABLESYNC_E2E_AUTH: "1",
      TABLESYNC_E2E_AUTH_KEY: e2eAuthKey,
      BETTER_AUTH_SECRET: e2eAuthKey,
      BETTER_AUTH_URL: appUrl,
      NEXT_PUBLIC_APP_URL: appUrl,
      DATABASE_POOL_SIZE: "1",
      DATABASE_POOL_MAX_USES: "0"
    });
    server.stdout?.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr?.on("data", (chunk) => process.stderr.write(chunk));

    await waitForServer();
    const testProcess = spawnCommand(
      process.execPath,
      [playwrightCli, "test", "--reporter=list", ...requestedPlaywrightArgs],
      true,
      {
        PLAYWRIGHT_EXTERNAL_SERVER: "1",
        TABLESYNC_E2E_BASE_URL: appUrl,
        TABLESYNC_E2E_RUN_ID: e2eRunId,
        TABLESYNC_E2E_AUTH_KEY: e2eAuthKey,
        ...(process.platform === "win32" ? { MOZ_DISABLE_CONTENT_SANDBOX: "1" } : {})
      }
    );
    const testExitCode = await waitForExit(testProcess);

    exitCode = testExitCode;
  } finally {
    if (server) {
      await stopProcess(server.pid);
    }
    await cleanupE2ERooms();
  }

  process.exit(exitCode);
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});

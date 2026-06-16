import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const isWindows = process.platform === "win32";
const npxCommand = "npx";
const appUrl = "http://localhost:3000";

function spawnCommand(command: string, args: string[], inherit = false, extraEnv: Record<string, string> = {}) {
  return spawn(command, args, {
    env: {
      ...process.env,
      ...extraEnv,
      CI: "1",
      NEXT_TELEMETRY_DISABLED: "1"
    },
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: isWindows,
    windowsHide: true
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    if (await isServerReady()) {
      return;
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${appUrl}`);
}

async function isServerReady() {
  try {
    const response = await fetch(appUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function stopProcessTree(pid?: number) {
  if (!pid) {
    return;
  }

  if (isWindows) {
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

async function main() {
  const serverAlreadyRunning = await isServerReady();
  const server = serverAlreadyRunning
    ? null
    : spawnCommand(npxCommand, ["next", "dev", "--hostname", "localhost", "--port", "3000"]);
  let exitCode = 1;

  server?.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  server?.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer();
    const testProcess = spawnCommand(npxCommand, ["playwright", "test", "--reporter=list"], true, {
      PLAYWRIGHT_EXTERNAL_SERVER: "1"
    });
    const testExitCode = await new Promise<number>((resolve) => {
      testProcess.on("exit", (code) => resolve(code ?? 1));
      testProcess.on("error", () => resolve(1));
    });

    exitCode = testExitCode;
  } finally {
    if (server) {
      await stopProcessTree(server.pid);
    }
  }

  process.exit(exitCode);
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});

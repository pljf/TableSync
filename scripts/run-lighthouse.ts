import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser } from "@playwright/test";

const port = 3001;
const remoteBaseUrl = process.env.TABLESYNC_LIGHTHOUSE_BASE_URL?.trim().replace(/\/$/, "");
const baseUrl = remoteBaseUrl || `http://localhost:${port}`;
const isRemote = Boolean(remoteBaseUrl);
const nextCli = "node_modules/next/dist/bin/next";
const lighthouseCli = "node_modules/lighthouse/cli/index.js";
const outputDirectory = resolve("docs", "evidence", "lighthouse", isRemote ? "staging" : "local");
const chromePort = 9223;
const pages: Array<{ name: string; path: string }> = [
  { name: "home", path: "/" },
  { name: "demo", path: "/demo" },
  ...(isRemote ? [{ name: "dashboard", path: "/dashboard" }] : [])
];

type AuditResult = {
  accessibility: number;
  bestPractices: number;
  cls: number;
  performance: number;
};

function spawnCommand(command: string, args: string[], inherit = false) {
  return spawn(command, args, {
    env: {
      ...process.env,
      CHROME_PATH: chromium.executablePath(),
      CI: "1",
      DATABASE_POOL_MAX_USES: "0",
      DATABASE_POOL_SIZE: "1",
      NEXT_TELEMETRY_DISABLED: "1"
    },
    shell: false,
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
}

function waitForExit(child: ReturnType<typeof spawnCommand>) {
  return new Promise<number>((resolveExit) => {
    child.on("exit", (code) => resolveExit(code ?? 1));
    child.on("error", () => resolveExit(1));
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    try {
      if ((await fetch(baseUrl)).ok) {
        return;
      }
    } catch {
      // The production server is still starting.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${baseUrl}.`);
}

async function waitForChrome() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    try {
      if ((await fetch(`http://localhost:${chromePort}/json/version`)).ok) {
        return;
      }
    } catch {
      // Chromium is still starting.
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for the Lighthouse Chromium instance.");
}

async function stopProcess(pid?: number) {
  if (!pid) return;
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

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function readAudit(path: string): Promise<AuditResult> {
  const report = JSON.parse(await readFile(path, "utf8")) as {
    audits: Record<string, { numericValue?: number }>;
    categories: Record<string, { score: number | null }>;
  };
  return {
    accessibility: Math.round((report.categories.accessibility.score ?? 0) * 100),
    bestPractices: Math.round((report.categories["best-practices"].score ?? 0) * 100),
    cls: report.audits["cumulative-layout-shift"].numericValue ?? Number.POSITIVE_INFINITY,
    performance: Math.round((report.categories.performance.score ?? 0) * 100)
  };
}

async function main() {
  if (isRemote) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
      throw new Error("Remote Lighthouse requires a non-local HTTPS deployment origin.");
    }
    if (!process.env.TABLESYNC_STAGING_SESSION_COOKIE) {
      throw new Error("TABLESYNC_STAGING_SESSION_COOKIE is required for the authenticated staging audit.");
    }
  }
  await mkdir(outputDirectory, { recursive: true });
  const chromeProfile = await mkdtemp(resolve(tmpdir(), "tablesync-lighthouse-"));
  const server = isRemote
    ? null
    : spawnCommand(process.execPath, [nextCli, "start", "--hostname", "localhost", "--port", String(port)]);
  const chrome = spawnCommand(chromium.executablePath(), [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${chromeProfile}`
  ]);
  server?.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  server?.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  const summaries: Record<string, { median: AuditResult; runs: AuditResult[] }> = {};
  let browserConnection: Browser | null = null;
  try {
    await Promise.all([waitForServer(), waitForChrome()]);
    if (isRemote) {
      browserConnection = await chromium.connectOverCDP(`http://localhost:${chromePort}`);
      const context = browserConnection.contexts()[0];
      if (!context) throw new Error("Chromium did not expose a default audit context.");
      await context.addCookies([
        {
          name: process.env.TABLESYNC_STAGING_SESSION_COOKIE_NAME ?? "tablesync-auth.session_token",
          value: process.env.TABLESYNC_STAGING_SESSION_COOKIE!,
          url: baseUrl,
          httpOnly: true,
          sameSite: "Lax",
          secure: true
        }
      ]);
      const probePage = await context.newPage();
      await probePage.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
      if (new URL(probePage.url()).pathname !== "/dashboard") {
        throw new Error("The staging session did not authenticate the Lighthouse browser.");
      }
      await probePage.close();
    }
    for (const page of pages) {
      const runs: AuditResult[] = [];
      for (let index = 1; index <= 3; index += 1) {
        const outputPath = resolve(outputDirectory, `${page.name}-run-${index}.json`);
        const audit = spawnCommand(
          process.execPath,
          [
            lighthouseCli,
            `${baseUrl}${page.path}`,
            "--only-categories=performance,accessibility,best-practices",
            "--output=json",
            `--output-path=${outputPath}`,
            "--quiet",
            `--port=${chromePort}`
          ],
          true
        );
        const exitCode = await waitForExit(audit);
        if (exitCode !== 0) {
          throw new Error(`Lighthouse failed for ${page.name} run ${index}.`);
        }
        runs.push(await readAudit(outputPath));
      }
      summaries[page.name] = {
        runs,
        median: {
          accessibility: median(runs.map((run) => run.accessibility)),
          bestPractices: median(runs.map((run) => run.bestPractices)),
          cls: median(runs.map((run) => run.cls)),
          performance: median(runs.map((run) => run.performance))
        }
      };
    }
  } finally {
    if (browserConnection) await browserConnection.close().catch(() => undefined);
    else await stopProcess(chrome.pid);
    await stopProcess(server?.pid);
    await rm(chromeProfile, { force: true, maxRetries: 5, recursive: true, retryDelay: 250 }).catch(() => undefined);
  }

  await writeFile(resolve(outputDirectory, "summary.json"), `${JSON.stringify(summaries, null, 2)}\n`, "utf8");
  const failures = Object.entries(summaries).flatMap(([page, { median: result }]) => [
    ...(result.performance < 90 ? [`${page} Performance ${result.performance} < 90`] : []),
    ...(result.accessibility < 95 ? [`${page} Accessibility ${result.accessibility} < 95`] : []),
    ...(result.bestPractices < 95 ? [`${page} Best Practices ${result.bestPractices} < 95`] : []),
    ...(result.cls >= 0.1 ? [`${page} CLS ${result.cls} >= 0.1`] : [])
  ]);
  console.log(JSON.stringify(summaries, null, 2));
  if (failures.length > 0) {
    throw new Error(`Lighthouse thresholds failed:\n${failures.join("\n")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

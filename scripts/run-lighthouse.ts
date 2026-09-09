import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser } from "@playwright/test";

const port = 3001;
const remoteBaseUrl = process.env.TABLESYNC_LIGHTHOUSE_BASE_URL?.trim().replace(/\/$/, "");
const baseUrl = remoteBaseUrl || `http://localhost:${port}`;
const isRemote = Boolean(remoteBaseUrl);
const corePath = process.env.TABLESYNC_LIGHTHOUSE_CORE_PATH?.trim();
const coreSessionCookie = process.env.TABLESYNC_LIGHTHOUSE_SESSION_COOKIE?.trim();
const nextCli = "node_modules/next/dist/bin/next";
const lighthouseCli = "node_modules/lighthouse/cli/index.js";
const outputDirectory = resolve("docs", "evidence", "lighthouse", isRemote ? "staging" : "local");
const chromePort = 9223;
const pages: Array<{ name: string; path: string }> = [
  { name: "home", path: "/" },
  { name: "auth", path: "/auth" },
  ...(isRemote ? [{ name: "dashboard", path: "/dashboard" }] : []),
  ...(!isRemote && corePath ? [{ name: "core", path: corePath }] : [])
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
      ...(!isRemote ? { BETTER_AUTH_URL: baseUrl, NEXT_PUBLIC_APP_URL: baseUrl } : {}),
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

function assertPortAvailable(portNumber: number): Promise<void> {
  return new Promise((resolveAvailable, reject) => {
    const probe = createTcpServer();
    probe.once("error", () => reject(new Error(`Port ${portNumber} is unavailable. Stop its existing process before running the audit.`)));
    probe.listen({ port: portNumber, exclusive: true }, () => {
      probe.close((error) => error ? reject(error) : resolveAvailable());
    });
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

async function readAudit(path: string, expectedUrl: string): Promise<AuditResult> {
  const report = JSON.parse(await readFile(path, "utf8")) as {
    audits: Record<string, { numericValue?: number }>;
    categories: Record<string, { score: number | null }>;
    finalDisplayedUrl?: string;
  };
  if (report.finalDisplayedUrl !== expectedUrl) {
    throw new Error("Lighthouse finished on an unexpected page; refusing mislabeled audit results.");
  }
  return {
    accessibility: Math.round((report.categories.accessibility.score ?? 0) * 100),
    bestPractices: Math.round((report.categories["best-practices"].score ?? 0) * 100),
    cls: report.audits["cumulative-layout-shift"].numericValue ?? Number.POSITIVE_INFINITY,
    performance: Math.round((report.categories.performance.score ?? 0) * 100)
  };
}

async function main() {
  if (corePath || coreSessionCookie) {
    if (isRemote) throw new Error("The optional core fixture audit is available only for local runs.");
    if (!corePath || !coreSessionCookie) {
      throw new Error("TABLESYNC_LIGHTHOUSE_CORE_PATH and TABLESYNC_LIGHTHOUSE_SESSION_COOKIE must be supplied together.");
    }
    const parsedCoreUrl = new URL(corePath, baseUrl);
    if (
      parsedCoreUrl.origin !== new URL(baseUrl).origin ||
      parsedCoreUrl.pathname !== corePath || parsedCoreUrl.search || parsedCoreUrl.hash ||
      !/^(?:\/dashboard|\/rooms\/[A-Za-z0-9_-]+\/plans)$/.test(corePath)
    ) {
      throw new Error("TABLESYNC_LIGHTHOUSE_CORE_PATH must be a local /dashboard or /rooms/<id>/plans path without a query or fragment.");
    }
  }
  if (isRemote) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
      throw new Error("Remote Lighthouse requires a non-local HTTPS deployment origin.");
    }
    if (!process.env.TABLESYNC_STAGING_SESSION_COOKIE?.trim()) {
      throw new Error("TABLESYNC_STAGING_SESSION_COOKIE is required for the authenticated staging audit.");
    }
  }
  const sessionCookieName = (
    isRemote ? process.env.TABLESYNC_STAGING_SESSION_COOKIE_NAME : process.env.TABLESYNC_LIGHTHOUSE_SESSION_COOKIE_NAME
  )?.trim() || `${new URL(baseUrl).protocol === "https:" ? "__Secure-" : ""}tablesync-auth.session_token`;
  if (!/^(?:__Secure-)?tablesync-auth\.session_token$/.test(sessionCookieName)) {
    throw new Error("The Lighthouse session cookie name is not an approved TableSync session cookie.");
  }
  await Promise.all([
    ...(isRemote ? [] : [assertPortAvailable(port)]),
    assertPortAvailable(chromePort)
  ]);
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
    for (const page of pages) {
      const pageUrl = new URL(page.path, baseUrl).href;
      // Keep the public Home/Auth runs signed out; /auth redirects a signed-in
      // browser to Dashboard and would otherwise produce mislabeled evidence.
      if ((isRemote && page.name === "dashboard") || (!isRemote && page.name === "core")) {
        browserConnection = await chromium.connectOverCDP(`http://localhost:${chromePort}`);
        const context = browserConnection.contexts()[0];
        if (!context) throw new Error("Chromium did not expose a default audit context.");
        await context.addCookies([
          {
            name: sessionCookieName,
            value: isRemote ? process.env.TABLESYNC_STAGING_SESSION_COOKIE!.trim() : coreSessionCookie!,
            url: baseUrl,
            httpOnly: true,
            sameSite: "Lax",
            secure: new URL(baseUrl).protocol === "https:"
          }
        ]);
        const probePage = await context.newPage();
        await probePage.goto(pageUrl, { waitUntil: "networkidle" });
        if (probePage.url() !== pageUrl) {
          throw new Error("The supplied session did not authenticate the expected Lighthouse page.");
        }
        await probePage.close();
      }
      const runs: AuditResult[] = [];
      for (let index = 1; index <= 3; index += 1) {
        const outputPath = resolve(outputDirectory, `${page.name}-run-${index}.json`);
        const audit = spawnCommand(
          process.execPath,
          [
            lighthouseCli,
            pageUrl,
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
        runs.push(await readAudit(outputPath, pageUrl));
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
    // Closing a CDP connection disconnects Playwright; the Chromium process
    // we launched still belongs to this audit and must also be stopped.
    await stopProcess(chrome.pid);
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

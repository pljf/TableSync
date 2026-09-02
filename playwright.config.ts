import { defineConfig, devices } from "@playwright/test";

const useExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1";
const baseURL = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "npx next dev --hostname localhost --port 3000",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        gracefulShutdown: { signal: "SIGTERM", timeout: 1000 },
        timeout: 120_000
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ]
});

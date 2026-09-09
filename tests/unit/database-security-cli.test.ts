import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ connect: vi.fn(), end: vi.fn() }));
vi.mock("dotenv/config", () => ({}));
vi.mock("pg", () => ({
  Client: class {
    on() { return this; }
    connect = mocks.connect;
    end = mocks.end;
  }
}));

const originalExitCode = process.exitCode;
const originalArguments = process.argv;

afterEach(() => {
  process.exitCode = originalExitCode;
  process.argv = originalArguments;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("redacts driver failures, closes both clients and exits unsuccessfully", async () => {
  vi.resetModules();
  const canary = "private-connection-detail-that-must-not-be-logged";
  mocks.connect.mockRejectedValue(new Error(canary));
  mocks.end.mockResolvedValue(undefined);
  const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const connection = (role: string, host: string) => ["postgresql", "://", role, ":", canary, "@", host, "/tablesync?sslmode=verify-full"].join("");
  for (const [name, value] of Object.entries({
    TABLESYNC_DEPLOYMENT_ENV: "staging", TABLESYNC_DATABASE_SCOPE: "acceptance",
    DATABASE_RUNTIME_MODE: "pooled", DATABASE_POOL_SIZE: "8", DATABASE_POOL_MAX_USES: "5000",
    DATABASE_URL: connection("runtime", "pool.example.invalid"),
    DIRECT_URL: connection("migration", "direct.example.invalid")
  })) vi.stubEnv(name, value);
  process.argv = [process.execPath, "scripts/verify-database-security.ts"];
  await import("../../scripts/verify-database-security");
  await vi.waitFor(() => expect(process.exitCode).toBe(1));
  expect(mocks.end).toHaveBeenCalledTimes(2);
  expect(errors).toHaveBeenCalledWith(expect.stringContaining("Database security verification failed"));
  expect(JSON.stringify([errors.mock.calls, logs.mock.calls])).not.toContain(canary);
});

import { Socket } from "node:net";
import { TLSSocket } from "node:tls";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(), end: vi.fn(), query: vi.fn(),
  streams: [] as unknown[], configurations: [] as { connectionString: string }[]
}));
vi.mock("dotenv/config", () => ({}));
vi.mock("pg", () => ({
  Client: class {
    connection: { stream: unknown };
    role: string;
    constructor(configuration: { connectionString: string }) {
      mocks.configurations.push(configuration);
      this.connection = { stream: mocks.streams.shift() };
      this.role = new URL(configuration.connectionString).username;
    }
    on() { return this; }
    connect = mocks.connect;
    end = mocks.end;
    query() { return mocks.query(this.role); }
  }
}));

const originalExitCode = process.exitCode;
const originalArguments = process.argv;
const sockets: Socket[] = [];

beforeEach(() => {
  vi.resetModules();
  mocks.connect.mockReset().mockResolvedValue(undefined);
  mocks.end.mockReset().mockResolvedValue(undefined);
  mocks.query.mockReset();
  mocks.streams.length = 0;
  mocks.configurations.length = 0;
  process.exitCode = undefined;
});

afterEach(() => {
  process.exitCode = originalExitCode;
  process.argv = originalArguments;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const socket of sockets.splice(0)) socket.destroy();
});

function configureEnvironment(canary: string) {
  const connection = (role: string, host: string) => ["postgresql", "://", role, ":", canary, "@", host, "/tablesync?sslmode=require"].join("");
  for (const [name, value] of Object.entries({
    TABLESYNC_DEPLOYMENT_ENV: "staging", TABLESYNC_DATABASE_SCOPE: "acceptance",
    DATABASE_RUNTIME_MODE: "pooled", DATABASE_POOL_SIZE: "8", DATABASE_POOL_MAX_USES: "5000",
    DATABASE_URL: connection("runtime", "pool.example.invalid"),
    DIRECT_URL: connection("migration", "direct.example.invalid")
  })) vi.stubEnv(name, value);
  process.argv = [process.execPath, "scripts/verify-database-security.ts"];
}

function transport(kind: "verified" | "unauthorized" | "plaintext") {
  const socket = kind === "plaintext" ? new Socket() : new TLSSocket(new Socket());
  if (socket instanceof TLSSocket) socket.authorized = kind === "verified";
  sockets.push(socket);
  return socket;
}

it("redacts driver failures, closes both clients and exits unsuccessfully", async () => {
  const canary = "private-connection-detail-that-must-not-be-logged";
  mocks.connect.mockRejectedValue(new Error(canary));
  const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
  configureEnvironment(canary);
  await import("../../scripts/verify-database-security");
  await vi.waitFor(() => expect(process.exitCode).toBe(1));
  expect(mocks.end).toHaveBeenCalledTimes(2);
  expect(errors).toHaveBeenCalledWith(expect.stringContaining("Database security verification failed"));
  expect(JSON.stringify([errors.mock.calls, logs.mock.calls])).not.toContain(canary);
});

it.each([
  { name: "accepts verified clients behind a proxy", runtime: "verified", migration: "verified", backendSsl: false, passed: true },
  { name: "rejects plaintext despite backend TLS", runtime: "plaintext", migration: "verified", backendSsl: true, passed: false },
  { name: "rejects an unverified runtime certificate", runtime: "unauthorized", migration: "verified", backendSsl: true, passed: false },
  { name: "rejects an unverified migration certificate", runtime: "verified", migration: "unauthorized", backendSsl: true, passed: false }
] as const)("$name", async ({ runtime, migration, backendSsl, passed }) => {
  configureEnvironment("private-proxy-test-credential");
  mocks.streams.push(transport(runtime), transport(migration));
  mocks.query.mockImplementation((role: string) => Promise.resolve({ rows: [{
    role, backendSsl,
    rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false, rolbypassrls: false,
    canCreateInDatabase: false, canCreateInPublic: role === "migration", canUsePublic: true,
    canReadMigrations: true, ownsApplicationTables: 0, allApplicationCrud: true, anyDangerousTableGrant: false
  }] }));
  const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  await import("../../scripts/verify-database-security");
  await vi.waitFor(() => expect(logs).toHaveBeenCalledTimes(1));
  const report = JSON.parse(logs.mock.calls[0][0] as string);
  expect(report.status).toBe(passed ? "passed" : "failed");
  expect(report.runtime).toMatchObject({ tls: runtime === "verified", backendTls: backendSsl });
  expect(report.migration).toMatchObject({ tls: migration === "verified", backendTls: backendSsl });
  expect(process.exitCode).toBe(passed ? undefined : 1);
  expect(mocks.end).toHaveBeenCalledTimes(2);
  for (const configuration of mocks.configurations) {
    expect(new URL(configuration.connectionString).searchParams.get("sslmode")).toBe("verify-full");
  }
  expect(JSON.stringify([logs.mock.calls, errors.mock.calls])).not.toContain("private-proxy-test-credential");
});

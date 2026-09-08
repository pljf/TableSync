import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clients = vi.hoisted(() => ({ created: vi.fn(), adapters: vi.fn() }));
vi.mock("dotenv/config", () => ({}));
vi.mock("@/lib/database-environment", () => ({
  assertRuntimeDatabaseEnvironment: vi.fn(),
  inspectDatabaseEnvironment: () => ({ poolSize: 1, poolMaxUses: null })
}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class { constructor(options: unknown) { clients.adapters(options); } } }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: class { constructor(options: unknown) { clients.created(options); } } }));

const shared = globalThis as typeof globalThis & { prisma?: unknown };
const originalClient = shared.prisma;

describe("Prisma pool ownership across server bundles", () => {
  beforeEach(() => {
    delete shared.prisma;
    vi.resetModules();
    vi.clearAllMocks();
  });
  afterEach(() => {
    if (originalClient === undefined) delete shared.prisma;
    else shared.prisma = originalClient;
    vi.unstubAllEnvs();
  });

  it.each(["production", "development"])("shares one client after separate module evaluation in %s", async (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    const pageBundle = await import("@/lib/prisma");
    vi.resetModules();
    const routeBundle = await import("@/lib/prisma");
    expect(routeBundle.prisma).toBe(pageBundle.prisma);
    expect(shared.prisma).toBe(pageBundle.prisma);
    expect(clients.created).toHaveBeenCalledTimes(1);
    expect(clients.adapters).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ max: 1 }));
  });
});

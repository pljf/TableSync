import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { assertRuntimeDatabaseEnvironment, inspectDatabaseEnvironment } from "@/lib/database-environment";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  assertRuntimeDatabaseEnvironment();
  const databaseEnvironment = inspectDatabaseEnvironment();
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://tablesync:tablesync@127.0.0.1:5432/tablesync";
  const maxUses =
    databaseEnvironment.poolMaxUses && databaseEnvironment.poolMaxUses > 0
      ? databaseEnvironment.poolMaxUses
      : undefined;

  return new PrismaClient({
    transactionOptions: { maxWait: 10_000, timeout: 10_000 },
    adapter: new PrismaPg({
      connectionString,
      max: databaseEnvironment.poolSize,
      maxUses,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000
    })
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Next can bundle route handlers and server pages separately in production.
// Share their client within the process so the configured pool limit is real.
globalForPrisma.prisma = prisma;

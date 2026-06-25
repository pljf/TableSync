import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://tablesync:tablesync@127.0.0.1:5432/tablesync";
  const configuredMaxUses = Number(process.env.DATABASE_POOL_MAX_USES ?? "0");
  const maxUses = Number.isInteger(configuredMaxUses) && configuredMaxUses > 0 ? configuredMaxUses : undefined;

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: Number(process.env.DATABASE_POOL_SIZE ?? "10"),
      maxUses,
      idleTimeoutMillis: 30_000
    })
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

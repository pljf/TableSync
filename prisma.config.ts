import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl = process.env.DIRECT_URL?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL?.trim();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: directUrl || databaseUrl || "",
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {})
  }
});

import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { configureDatabaseTestPool } from "./scripts/lib/database-test-environment.ts";

configureDatabaseTestPool(process.env);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/database/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});

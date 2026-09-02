import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

process.env.DATABASE_POOL_SIZE = "1";
process.env.DATABASE_POOL_MAX_USES = "0";

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

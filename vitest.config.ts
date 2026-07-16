import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" throws unconditionally outside Next's webpack build
      // (which normally aliases it away for server bundles) — stub it out
      // so server-only-guarded modules can still be unit tested directly.
      "server-only": path.resolve(__dirname, "./src/lib/gamification/__tests__/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Closes the real DB connection pool after each *.integration.test.ts
    // file when TEST_DATABASE_URL is set (see the file for why) — a no-op
    // otherwise, so this has no effect on the normal mocked-Prisma suite.
    setupFiles: ["src/__tests__/integration/global-teardown.ts"],
  },
});

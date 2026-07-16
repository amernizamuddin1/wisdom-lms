// Vitest setup file (registered globally in vitest.config.ts) — closes the
// real Prisma connection pool after each integration test file finishes.
// Without this, every *.integration.test.ts file's dynamic `@/lib/prisma`
// import creates its own new pg Pool (module isolation gives each test file
// a fresh module registry) that's never released, and the local `prisma dev`
// (PGlite) server has limited concurrent-connection capacity — running more
// than a couple of files back to back without disconnecting reliably crashes
// it ("Connection terminated unexpectedly"). A no-op when TEST_DATABASE_URL
// isn't set, so this has zero effect on normal `npm test`.
import { afterAll } from "vitest";

afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  const { platformPrisma } = await import("@/lib/prisma");
  await platformPrisma.$disconnect();
});

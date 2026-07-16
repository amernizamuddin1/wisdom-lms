// Shared helper for the real-DB (not mocked) tenant-isolation integration
// suite. Every *.integration.test.ts file in this directory imports
// `hasStagingDb` and gates its whole `describe` block with
// `describe.skipIf(!hasStagingDb)`, so `npm test` stays green and fast with
// no staging DB present (CI, a fresh contributor checkout) — these only run
// when TEST_DATABASE_URL is explicitly set on the process environment
// (`TEST_DATABASE_URL=... npm test`), i.e. against the local `prisma dev`
// staging DB set up for this validation pass (see
// docs/multi-tenancy.md "Staging validation").
//
// Deliberately does NOT auto-load .env.staging.local here (unlike the CLI
// seed/verify scripts, which always require it) — TEST_DATABASE_URL must be
// an explicit, conscious opt-in on every single `npm test` invocation.
// dotenv's default merge behavior only fills in *unset* vars, so an
// unconditional `dotenv.config()` here would make every future `npm test`
// silently pick the staging DB back up for any contributor who still has
// the (gitignored, so it never leaves their machine) file on disk — turning
// "opt-in integration tests" into "accidentally always on."
import { randomUUID } from "crypto";

export const hasStagingDb = !!process.env.TEST_DATABASE_URL;

if (hasStagingDb) {
  const host = new URL(process.env.TEST_DATABASE_URL!.replace(/^postgres(ql)?:/, "http:")).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Integration tests refuse to run against non-local host "${host}".`);
  }
  // src/lib/prisma.ts reads process.env.DATABASE_URL at import time — every
  // test file must dynamically `await import("@/lib/prisma")` inside a
  // beforeAll (never a static top-level import) so this assignment always
  // happens first.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

export const WISDOMQUANT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_ACADEMY_TENANT_ID = "00000000-0000-0000-0000-000000000002";

// Short unique suffix for test-run-scoped fixture data (emails, slugs, codes)
// so repeated runs against the same persistent staging DB never collide.
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

// Dynamically imports the real prisma module (safe only once DATABASE_URL is
// set — see above). Returns the auto-scoped client, the unscoped
// `platformPrisma`, and `runWithTenant`.
export async function loadPrismaModule() {
  return import("@/lib/prisma");
}

// Runs `fn` with the auto-scoped `prisma` client acting as the given tenant,
// via the same runWithTenant/AsyncLocalStorage mechanism webhooks and cron
// jobs use — the most realistic way to exercise the auto-scoping extension
// in a test without a real HTTP request/proxy.ts round trip.
// `fn` receives the freshly (re-)imported prisma module INSIDE the
// AsyncLocalStorage-scoped callback. This is deliberate, not just
// convenience: resolving `@/lib/prisma` (or any module that transitively
// re-imports it) *before* entering runWithTenantContext, then calling a
// query method on it from a plain synchronous arrow passed in, proved to
// intermittently lose the tenant-context override by the time the query
// actually dispatched (surfaced as "headers called outside a request
// scope" from a query that should have used the override, never headers()
// at all). Always loading prisma from inside the callback, after at least
// one `await`, was reliable in every repro; treat this signature as the
// only supported way to run a tenant-scoped query in these tests.
export async function asTenant<T>(
  tenantId: string,
  tenantSlug: string,
  fn: (mod: Awaited<ReturnType<typeof loadPrismaModule>>) => Promise<T>,
): Promise<T> {
  const { runWithTenantContext } = await import("@/lib/tenant-context");
  return runWithTenantContext({ tenantId, tenantSlug }, async () => {
    const mod = await loadPrismaModule();
    return fn(mod);
  });
}

// Tracks rows created by a test (by [platformPrisma model delegate name, id])
// so afterEach can clean them up in reverse order without needing real
// transactional rollback (the global `prisma`/`platformPrisma` singletons
// aren't transaction-scoped, so this is the pragmatic alternative on a
// disposable local staging DB).
export class Cleanup {
  private ops: Array<() => Promise<unknown>> = [];

  track(fn: () => Promise<unknown>) {
    this.ops.push(fn);
  }

  async run() {
    for (const op of this.ops.reverse()) {
      await op().catch(() => {
        // Best-effort — a row may already be gone via cascade delete from
        // an earlier cleanup op in this same batch.
      });
    }
    this.ops = [];
  }
}

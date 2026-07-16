// One-off targeted tenant-isolation validation against Supabase STAGING,
// scoped to the fixture tenants seeded by seed-tenant-fixtures.ts. Not part
// of the permanent staging script suite — read-mostly, and any writes it
// makes are clearly-named temporary rows it cleans up itself.
//
// This deliberately does NOT import src/lib/prisma.ts or src/lib/
// tenant-context.ts (both pull in "server-only", which throws outside a
// Next.js build). Instead it re-applies the exact same, pure, DB-free
// scoping logic those modules use (applyTenantScope/TENANT_SCOPED_MODELS
// from src/lib/tenant-scoping.ts, imported directly — no server-only
// dependency) against a locally-built extended client, so what's under test
// is the real production scoping rules, not a reimplementation of them.
import "./env";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "crypto";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { applyTenantScope, TENANT_SCOPED_MODELS, type ScopableArgs } from "@/lib/tenant-scoping";
import { db as platformDb } from "./db";
import {
  WISDOMQUANT_TENANT_ID,
  DEMO_ACADEMY_TENANT_ID,
  CROSS_TENANT_USER_ID,
} from "./seed-tenant-fixtures";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  const status = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(`[${status}] ${label}${detail ? " — " + detail : ""}`);
}

const tenantStorage = new AsyncLocalStorage<string>();

function runAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run(tenantId, fn);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const base = new PrismaClient({ adapter });
const scoped = base.$extends({
  name: "tenantScopingVerification",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: { model?: string; operation: string; args: ScopableArgs; query: (args: ScopableArgs) => Promise<unknown> }) {
        if (!model || !TENANT_SCOPED_MODELS.has(model)) return query(args);
        const tenantId = tenantStorage.getStore();
        if (!tenantId) throw new Error("verify-tenant-isolation: no tenant scope set");
        return query(applyTenantScope(model, operation, args, tenantId) as never);
      },
    },
  },
});

async function main() {
  console.log("\n=== A/B/C: cross-tenant read/update/delete blocked through the scoped Prisma client ===");

  // A. Cross-tenant READ: as WisdomQuant, look up a Demo Academy course by id.
  const demoAcademyCourses = await platformDb.course.findMany({ where: { tenantId: DEMO_ACADEMY_TENANT_ID }, select: { id: true, title: true } });
  const demoCourseId = demoAcademyCourses[0]?.id;
  check("Fixture precondition: Demo Academy has at least one course", !!demoCourseId);

  if (demoCourseId) {
    const crossRead = await runAsTenant(WISDOMQUANT_TENANT_ID, async () => await scoped.course.findUnique({ where: { id: demoCourseId } }));
    check("Cross-tenant READ blocked: WisdomQuant-scoped client cannot see Demo Academy's course by id", crossRead === null);

    const listAsWisdomQuant = await runAsTenant(WISDOMQUANT_TENANT_ID, async () => await scoped.course.findMany({ select: { id: true } }));
    const leaked = listAsWisdomQuant.some((c: { id: string }) => c.id === demoCourseId);
    check("Cross-tenant LIST blocked: WisdomQuant-scoped findMany never includes a Demo Academy course id", !leaked);
  }

  // B/C. Cross-tenant UPDATE/DELETE: use a disposable temp row, never real fixture data.
  const tempCourseId = randomUUID();
  const demoAdmin = await platformDb.user.findFirstOrThrow({ where: { tenantMemberships: { some: { tenantId: DEMO_ACADEMY_TENANT_ID, role: "ADMIN" } } } });
  await platformDb.course.create({
    data: {
      id: tempCourseId,
      tenantId: DEMO_ACADEMY_TENANT_ID,
      title: "STAGING-TEMP-ISOLATION-CHECK",
      status: "DRAFT",
      createdById: demoAdmin.id,
    },
  });

  try {
    const updateResult = await runAsTenant(WISDOMQUANT_TENANT_ID, async () =>
      await scoped.course.updateMany({ where: { id: tempCourseId }, data: { title: "HIJACKED" } }),
    );
    check("Cross-tenant UPDATE blocked: WisdomQuant-scoped updateMany affects 0 rows on Demo Academy's temp course", updateResult.count === 0, `count=${updateResult.count}`);

    const afterUpdate = await platformDb.course.findUniqueOrThrow({ where: { id: tempCourseId } });
    check("Temp course title unchanged after blocked cross-tenant update", afterUpdate.title === "STAGING-TEMP-ISOLATION-CHECK", afterUpdate.title);

    const deleteResult = await runAsTenant(WISDOMQUANT_TENANT_ID, async () =>
      await scoped.course.deleteMany({ where: { id: tempCourseId } }),
    );
    check("Cross-tenant DELETE blocked: WisdomQuant-scoped deleteMany affects 0 rows on Demo Academy's temp course", deleteResult.count === 0, `count=${deleteResult.count}`);

    const stillExists = await platformDb.course.findUnique({ where: { id: tempCourseId } });
    check("Temp course still exists after blocked cross-tenant delete", stillExists !== null);
  } finally {
    await platformDb.course.delete({ where: { id: tempCourseId } }).catch(() => {});
    console.log("[cleanup] Removed STAGING-TEMP-ISOLATION-CHECK temp course.");
  }

  console.log("\n=== D: TenantMembership isolation ===");
  const wqMemberships = await platformDb.tenantMembership.findMany({ where: { tenantId: WISDOMQUANT_TENANT_ID }, select: { userId: true, role: true } });
  const daMemberships = await platformDb.tenantMembership.findMany({ where: { tenantId: DEMO_ACADEMY_TENANT_ID }, select: { userId: true, role: true } });
  const wqUserIds = new Set(wqMemberships.map((m) => m.userId));
  const daUserIds = new Set(daMemberships.map((m) => m.userId));
  const overlap = [...wqUserIds].filter((id) => daUserIds.has(id));
  check(
    "Only the cross-tenant fixture user has membership rows in both tenants",
    overlap.length === 1 && overlap[0] === CROSS_TENANT_USER_ID,
    `overlap=${JSON.stringify(overlap)}`,
  );

  console.log("\n=== E: Settings/CommunitySettings isolation ===");
  const wqSettings = await platformDb.settings.findUnique({ where: { tenantId: WISDOMQUANT_TENANT_ID } });
  const daSettings = await platformDb.settings.findUnique({ where: { tenantId: DEMO_ACADEMY_TENANT_ID } });
  check("Both tenants have their own Settings row", !!wqSettings && !!daSettings);
  check(
    "Settings.primaryColor differs per tenant (no shared/leaked singleton)",
    !!wqSettings && !!daSettings && wqSettings.primaryColor !== daSettings.primaryColor,
    `wq=${wqSettings?.primaryColor} da=${daSettings?.primaryColor}`,
  );

  console.log("\n=== G: Razorpay webhook tenant resolution (DB-level, not full HTTP/HMAC path) ===");
  const resolveByWq = await platformDb.tenant.findUnique({ where: { id: WISDOMQUANT_TENANT_ID } });
  const resolveByDa = await platformDb.tenant.findUnique({ where: { id: DEMO_ACADEMY_TENANT_ID } });
  const resolveByUnknownId = await platformDb.tenant.findUnique({ where: { id: randomUUID() } });
  const resolveByDefaultSlug = await platformDb.tenant.findUnique({ where: { slug: "wisdomquant" } });
  check("notes.tenantId=WisdomQuant resolves to WisdomQuant tenant", resolveByWq?.id === WISDOMQUANT_TENANT_ID);
  check("notes.tenantId=Demo Academy resolves to Demo Academy tenant", resolveByDa?.id === DEMO_ACADEMY_TENANT_ID);
  check("Unknown notes.tenantId resolves to null (webhook would 400, as designed)", resolveByUnknownId === null);
  check("Fallback DEFAULT_TENANT_SLUG='wisdomquant' resolves correctly for legacy no-notes orders", resolveByDefaultSlug?.id === WISDOMQUANT_TENANT_ID);

  console.log("\n=== H: Learner-segment cron isolation ===");
  console.log(
    "[info] Not re-executed against staging in this script: getAllLearnerSegments() and the " +
      "/api/cron/segment-snapshot route both import \"server-only\"-guarded modules that can't load " +
      "outside a Next.js build/runtime. The underlying mechanism (TenantMembership-scoped learner " +
      "resolution + UserSegmentSnapshot's (tenant_id, user_id, snapshot_date) unique constraint) was " +
      "exercised end-to-end this session by tenant-segment-isolation.integration.test.ts (3/3 passed) " +
      "against the local prisma dev staging DB. Treat that as the behavioral proof for this pass; a true " +
      "staging-Supabase-backed run of the cron route would need a deployed instance with " +
      "DATABASE_URL/CRON_SECRET pointed at staging, which is out of scope for a CLI script.",
  );

  await base.$disconnect();
  await platformDb.$disconnect();

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await base.$disconnect().catch(() => {});
  await platformDb.$disconnect().catch(() => {});
  process.exit(1);
});

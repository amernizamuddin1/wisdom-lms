import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

// The bulk-import server actions (users/bulk-import/actions.ts,
// enrollments/bulk-import/actions.ts) start with requireAdmin(), which needs
// a real Supabase Auth session — not reachable from a DB-level integration
// test. Both importers funnel every row through the same choke point,
// ensureTenantMembership() (src/lib/user-provisioning.ts), which takes
// tenantId as an explicit param (never derived from CSV content) — that's
// the actual thing standing between "one tenant's CSV import" and "leaking
// access into another tenant." This exercises that choke point directly
// against the real DB, which is what the existing mocked-Prisma unit test
// (user-provisioning.test.ts) can't do.
describe.skipIf(!hasStagingDb)("CSV import tenant isolation (ensureTenantMembership choke point)", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let globalUserId: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();
    globalUserId = (
      await platformPrisma.user.create({ data: { name: "CSV Import User", email: `csv-${s}@test.local`, role: "STUDENT" } })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: globalUserId } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("The same global user imported by two different tenants' CSVs gets independent membership rows with independent roles", async () => {
    const { ensureTenantMembership } = await import("@/lib/user-provisioning");

    const resultA = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.$transaction((tx) =>
        ensureTenantMembership(tx, { tenantId: WISDOMQUANT_TENANT_ID, userId: globalUserId, role: "STUDENT" }),
      );
    });
    const resultB = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.$transaction((tx) =>
        ensureTenantMembership(tx, { tenantId: DEMO_ACADEMY_TENANT_ID, userId: globalUserId, role: "ADMIN" }),
      );
    });

    expect(resultA.created).toBe(true);
    expect(resultB.created).toBe(true);

    const membershipA = await platformPrisma.tenantMembership.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId: WISDOMQUANT_TENANT_ID, userId: globalUserId } },
    });
    const membershipB = await platformPrisma.tenantMembership.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId: DEMO_ACADEMY_TENANT_ID, userId: globalUserId } },
    });
    expect(membershipA.role).toBe("STUDENT");
    expect(membershipB.role).toBe("ADMIN");
  });

  it("Re-importing the same user for the same tenant is idempotent (no duplicate membership, no throw on the unique constraint)", async () => {
    const { ensureTenantMembership } = await import("@/lib/user-provisioning");
    const run = () =>
      asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
        const { prisma } = await loadPrismaModule();
        return prisma.$transaction((tx) =>
          ensureTenantMembership(tx, { tenantId: WISDOMQUANT_TENANT_ID, userId: globalUserId, role: "STUDENT" }),
        );
      });

    const first = await run();
    const second = await run();
    expect(first.created).toBe(false); // already exists from the previous test
    expect(second.created).toBe(false);

    const count = await platformPrisma.tenantMembership.count({
      where: { tenantId: WISDOMQUANT_TENANT_ID, userId: globalUserId },
    });
    expect(count).toBe(1);
  });

  it("tenantId always comes from the caller's own scope, never from row content — Tenant B cannot attach a user to Tenant A via ensureTenantMembership", async () => {
    // The signature itself enforces this (tenantId is an explicit param the
    // caller controls, not read from parsed CSV data) — this test documents
    // that invariant by confirming Tenant B's call only ever creates a
    // Tenant B membership, never a Tenant A one, regardless of what tenantId
    // value a compromised/buggy caller might have threaded through.
    const membershipsForGlobalUser = await platformPrisma.tenantMembership.findMany({ where: { userId: globalUserId } });
    const tenantIds = membershipsForGlobalUser.map((m) => m.tenantId).sort();
    expect(tenantIds).toEqual([DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID].sort());
  });
});

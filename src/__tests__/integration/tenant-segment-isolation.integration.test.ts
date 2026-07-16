import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

// Direct regression test for the fixed cross-tenant leak: a single global
// User with independent, differently-roled TenantMembership rows in two
// tenants must never let one tenant's segment computation see the other
// tenant's learners, and the cron's per-tenant snapshot write must never
// collide on the (tenantId, userId, snapshotDate) unique constraint.
describe.skipIf(!hasStagingDb)("Learner-segment cross-tenant isolation", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let sharedUser: string;
  let tenantAOnlyLearner: string;
  let tenantBOnlyLearner: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();

    // Belongs to both tenants, with a different role in each — the exact
    // shape that used to collide on the old (userId, snapshotDate) unique
    // constraint once resolved via the global, unscoped User.role query.
    sharedUser = (
      await platformPrisma.user.create({
        data: {
          name: "Cross Tenant Shared Learner",
          email: `shared-learner-${s}@test.local`,
          role: "STUDENT",
          tenantMemberships: {
            create: [
              { tenantId: WISDOMQUANT_TENANT_ID, role: "STUDENT", status: "ACTIVE" },
              { tenantId: DEMO_ACADEMY_TENANT_ID, role: "ADMIN", status: "ACTIVE" },
            ],
          },
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: sharedUser } }));

    tenantAOnlyLearner = (
      await platformPrisma.user.create({
        data: {
          name: "Tenant A Only Learner",
          email: `tenant-a-only-${s}@test.local`,
          role: "STUDENT",
          tenantMemberships: { create: { tenantId: WISDOMQUANT_TENANT_ID, role: "STUDENT", status: "ACTIVE" } },
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: tenantAOnlyLearner } }));

    tenantBOnlyLearner = (
      await platformPrisma.user.create({
        data: {
          name: "Tenant B Only Learner",
          email: `tenant-b-only-${s}@test.local`,
          role: "STUDENT",
          tenantMemberships: { create: { tenantId: DEMO_ACADEMY_TENANT_ID, role: "STUDENT", status: "ACTIVE" } },
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: tenantBOnlyLearner } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("getAllLearnerSegments(), scoped to Tenant A, includes only Tenant A's eligible learners", async () => {
    const segments = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { getAllLearnerSegments } = await import("@/lib/analytics/learner-segments");
      return getAllLearnerSegments();
    });
    expect(segments.has(sharedUser)).toBe(true);
    expect(segments.has(tenantAOnlyLearner)).toBe(true);
    expect(segments.has(tenantBOnlyLearner)).toBe(false);
  });

  it("getAllLearnerSegments(), scoped to Tenant B, includes only Tenant B's eligible learners", async () => {
    const segments = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { getAllLearnerSegments } = await import("@/lib/analytics/learner-segments");
      return getAllLearnerSegments();
    });
    // sharedUser holds an ADMIN membership in Demo Academy, not STUDENT, so
    // they are not a Demo Academy learner even though they belong to it.
    expect(segments.has(sharedUser)).toBe(false);
    expect(segments.has(tenantBOnlyLearner)).toBe(true);
    expect(segments.has(tenantAOnlyLearner)).toBe(false);
  });

  it("segment-snapshot cron run for both tenants produces one row per tenant per shared learner, with no unique-constraint collision", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const { GET } = await import("@/app/api/cron/segment-snapshot/route");
    const { NextRequest } = await import("next/server");
    const request = new NextRequest("http://localhost/api/cron/segment-snapshot", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    const today = body.snapshotDate as string;

    const wqSnapshot = await platformPrisma.userSegmentSnapshot.findUnique({
      where: { tenantId_userId_snapshotDate: { tenantId: WISDOMQUANT_TENANT_ID, userId: sharedUser, snapshotDate: today } },
    });
    expect(wqSnapshot).not.toBeNull();

    // sharedUser is ADMIN (not STUDENT) in Demo Academy, so they get no
    // snapshot row there — but Tenant A's write must not have been blocked
    // or corrupted by Tenant B's iteration of the same cron run either way.
    const daSnapshot = await platformPrisma.userSegmentSnapshot.findUnique({
      where: { tenantId_userId_snapshotDate: { tenantId: DEMO_ACADEMY_TENANT_ID, userId: sharedUser, snapshotDate: today } },
    });
    expect(daSnapshot).toBeNull();

    const aOnlySnapshot = await platformPrisma.userSegmentSnapshot.findUnique({
      where: { tenantId_userId_snapshotDate: { tenantId: WISDOMQUANT_TENANT_ID, userId: tenantAOnlyLearner, snapshotDate: today } },
    });
    const bOnlySnapshot = await platformPrisma.userSegmentSnapshot.findUnique({
      where: { tenantId_userId_snapshotDate: { tenantId: DEMO_ACADEMY_TENANT_ID, userId: tenantBOnlyLearner, snapshotDate: today } },
    });
    expect(aOnlySnapshot).not.toBeNull();
    expect(bOnlySnapshot).not.toBeNull();
  });
});

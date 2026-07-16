import { describe, expect, it } from "vitest";
import { DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, hasStagingDb, loadPrismaModule } from "./db-helper";

describe.skipIf(!hasStagingDb)("Background jobs & Razorpay webhook tenant resolution", () => {
  // FIXED BUG (was documented in docs/multi-tenancy.md's "Known limitations"):
  // src/lib/analytics/learner-segments.ts::getAllLearnerSegments() used to
  // read `prisma.user.findMany({ where: { role: "STUDENT" } })` — User.role
  // is the deprecated legacy field, and User itself is a global, unscoped
  // model, so that query returned EVERY student across EVERY tenant, not
  // just the calling tenant's members. Run under runWithTenant() for tenant
  // A, it computed segments for tenant B's students too and wrote
  // UserSegmentSnapshot rows crediting them to tenant A. With two tenants
  // sharing a real user this was directly observable: the second tenant's
  // cron iteration tried to insert a (userId, snapshotDate) row the first
  // iteration already inserted — @@unique([userId, snapshotDate]) had no
  // tenantId in it — and the route's own $transaction threw, surfacing as a
  // 500. Fixed by resolving eligible learners via TenantMembership (scoped
  // to the ambient tenant) and widening the unique constraint to
  // (tenantId, userId, snapshotDate).
  it("segment-snapshot cron resolves learners via TenantMembership and never collides across tenants", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const { GET } = await import("@/app/api/cron/segment-snapshot/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("http://localhost/api/cron/segment-snapshot", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    // Both seeded tenants (WisdomQuant, Demo Academy) are ACTIVE.
    expect(body.tenants).toBeGreaterThanOrEqual(2);

    const { platformPrisma } = await loadPrismaModule();
    const today = body.snapshotDate as string;
    const snapshotsToday = await platformPrisma.userSegmentSnapshot.findMany({ where: { snapshotDate: today } });
    const tenantIdsSeen = new Set(snapshotsToday.map((s) => s.tenantId));
    for (const id of tenantIdsSeen) {
      expect([WISDOMQUANT_TENANT_ID, DEMO_ACADEMY_TENANT_ID]).toContain(id);
    }

    // No two snapshot rows for the same user land under the same tenant
    // for today — the unique constraint (tenantId, userId, snapshotDate)
    // is satisfied without the route needing to retry/skip anything.
    const seenKeys = new Set<string>();
    for (const snap of snapshotsToday) {
      const key = `${snap.tenantId}:${snap.userId}`;
      expect(seenKeys.has(key)).toBe(false);
      seenKeys.add(key);
    }
  });

  it("segment-snapshot cron rejects requests without the correct CRON_SECRET", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const { GET } = await import("@/app/api/cron/segment-snapshot/route");
    const { NextRequest } = await import("next/server");
    const request = new NextRequest("http://localhost/api/cron/segment-snapshot", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("Razorpay webhook resolves the tenant from notes.tenantId when present", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const { NextRequest } = await import("next/server");
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_1",
            order_id: "order_test_1",
            amount: 100000,
            notes: { tenantId: DEMO_ACADEMY_TENANT_ID, orderId: "nonexistent-order" },
          },
        },
      },
    });
    const request = new NextRequest("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": "irrelevant-since-no-creds-configured" },
      body,
    });
    const response = await POST(request);
    // Demo Academy has no Razorpay credentials configured — the route
    // acknowledges with 200 right after resolving the tenant, which is
    // exactly the branch that proves tenant resolution succeeded.
    expect(response.status).toBe(200);
  });

  it("Razorpay webhook falls back to DEFAULT_TENANT_SLUG when notes.tenantId is absent", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const { NextRequest } = await import("next/server");
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: { entity: { id: "pay_test_2", order_id: "order_test_2", amount: 100000, notes: {} } },
      },
    });
    const request = new NextRequest("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": "irrelevant" },
      body,
    });
    const response = await POST(request);
    // Falls back to the DEFAULT_TENANT_SLUG tenant (wisdomquant), which also
    // has no credentials configured in staging — same 200 acknowledgement.
    expect(response.status).toBe(200);
  });

  it("Razorpay webhook rejects an unresolvable tenant id with 400", async () => {
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const { NextRequest } = await import("next/server");
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_3",
            order_id: "order_test_3",
            amount: 100000,
            notes: { tenantId: "00000000-0000-0000-0000-0000deadbeef" },
          },
        },
      },
    });
    const request = new NextRequest("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": "irrelevant" },
      body,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Unknown tenant");
  });
});

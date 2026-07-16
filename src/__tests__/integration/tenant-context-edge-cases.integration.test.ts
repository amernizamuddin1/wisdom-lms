import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

describe.skipIf(!hasStagingDb)("Tenant context edge cases: no context, unknown host/tenant, id tampering", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];

  let resolveTenantFromHost: typeof import("@/lib/tenant-resolver")["resolveTenantFromHost"];

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    // tenant-resolver.ts reads process.env.ROOT_DOMAIN into a top-level
    // const at module-evaluation time, not per-call — it must be set
    // *before* this first import, and changing process.env afterward has
    // no effect on the already-evaluated module. So: set it once, import
    // once, reuse for every test below (all of them are fine with the same
    // ROOT_DOMAIN, including the local-dev-fallback case, which is
    // detected independently via isLocalDevHost()).
    process.env.ROOT_DOMAIN = "wisdomlms.test";
    ({ resolveTenantFromHost } = await import("@/lib/tenant-resolver"));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("A scoped query with no tenant context (no runWithTenant override, no request headers) throws rather than silently returning unscoped data", async () => {
    const { prisma } = await loadPrismaModule();
    // No asTenant() wrapper here — this deliberately runs with neither an
    // AsyncLocalStorage override nor real Next.js request headers, mirroring
    // "a script/job that forgot to set tenant context."
    // Outside a real Next.js request, next/headers' headers() itself throws
    // first ("called outside a request scope") before our own "No tenant
    // context available" check ever runs — either way, the invariant holds:
    // it throws, it never silently falls through to unscoped data.
    await expect(prisma.course.findMany({})).rejects.toThrow();
  });

  it("resolveTenantFromHost returns null for a completely unrecognized host", async () => {
    const tenant = await resolveTenantFromHost("totally-unknown-host.example.com");
    expect(tenant).toBeNull();
  });

  it("resolveTenantFromHost resolves Demo Academy's own subdomain correctly", async () => {
    const tenant = await resolveTenantFromHost("demo-academy.wisdomlms.test");
    expect(tenant?.id).toBe(DEMO_ACADEMY_TENANT_ID);
  });

  it("resolveTenantFromHost falls back to DEFAULT_TENANT_SLUG for local-dev hosts", async () => {
    const tenant = await resolveTenantFromHost("localhost:3000");
    expect(tenant?.id).toBe(WISDOMQUANT_TENANT_ID);
  });

  it("A PAUSED tenant is still resolvable by host (proxy.ts is what turns this into a 503, not the resolver)", async () => {
    const s = uniqueSuffix();
    const pausedTenant = await platformPrisma.tenant.create({
      data: { name: "Paused Co", slug: `paused-${s}`, subdomain: `paused-${s}`, status: "PAUSED" },
    });
    cleanup.track(() => platformPrisma.tenant.delete({ where: { id: pausedTenant.id } }));

    const resolved = await resolveTenantFromHost(`paused-${s}.wisdomlms.test`);
    expect(resolved?.status).toBe("PAUSED");
  });

  it("Manually substituting Tenant A's record id while scoped as Tenant B fails across every major model (id-tampering matrix)", async () => {
    const admin = await platformPrisma.user.create({
      data: { name: "Tamper Admin", email: `tamper-admin-${uniqueSuffix()}@test.local`, role: "ADMIN" },
    });
    cleanup.track(() => platformPrisma.user.delete({ where: { id: admin.id } }));
    const learner = await platformPrisma.user.create({
      data: { name: "Tamper Learner", email: `tamper-learner-${uniqueSuffix()}@test.local`, role: "STUDENT" },
    });
    cleanup.track(() => platformPrisma.user.delete({ where: { id: learner.id } }));

    const course = await platformPrisma.course.create({
      data: { tenantId: WISDOMQUANT_TENANT_ID, title: `Tamper Course ${uniqueSuffix()}`, createdById: admin.id },
    });
    cleanup.track(() => platformPrisma.course.delete({ where: { id: course.id } }));
    const certificate = await platformPrisma.certificate.create({
      data: {
        tenantId: WISDOMQUANT_TENANT_ID,
        userId: learner.id,
        courseId: course.id,
        certificateCode: `TAMPER-${uniqueSuffix()}`,
        fileUrl: "https://example.test/c.pdf",
      },
    });
    cleanup.track(() => platformPrisma.certificate.delete({ where: { id: certificate.id } }));
    const payment = await platformPrisma.payment.create({
      data: {
        tenantId: WISDOMQUANT_TENANT_ID,
        userId: learner.id,
        courseId: course.id,
        gateway: "RAZORPAY",
        currency: "INR",
        amount: "999.00",
        status: "COMPLETED",
      },
    });
    cleanup.track(() => platformPrisma.payment.delete({ where: { id: payment.id } }));

    const [foundCourse, foundCertificate, foundPayment] = await asTenant(
      DEMO_ACADEMY_TENANT_ID,
      "demo-academy",
      async ({ prisma }) =>
        Promise.all([
          prisma.course.findUnique({ where: { id: course.id } }),
          prisma.certificate.findUnique({ where: { id: certificate.id } }),
          prisma.payment.findUnique({ where: { id: payment.id } }),
        ]),
    );
    expect(foundCourse).toBeNull();
    expect(foundCertificate).toBeNull();
    expect(foundPayment).toBeNull();
  });
});

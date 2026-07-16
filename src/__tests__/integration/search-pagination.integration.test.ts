import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

// Covers search/filter/pagination/export-style queries — all of which are
// just findMany/count/aggregate calls under the hood, so this proves the
// auto-scoping extension covers those Prisma operations too, not just
// simple find-by-id reads.
describe.skipIf(!hasStagingDb)("Search, filtering, pagination & export scoping", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  const suffix = uniqueSuffix();
  const titleTag = `SP-${suffix}`;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const admin = await platformPrisma.user.create({ data: { name: "Admin", email: `sp-admin-${suffix}@test.local`, role: "ADMIN" } });
    cleanup.track(() => platformPrisma.user.delete({ where: { id: admin.id } }));

    for (let i = 0; i < 3; i++) {
      const c = await platformPrisma.course.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, title: `${titleTag} WisdomQuant Course ${i}`, createdById: admin.id },
      });
      cleanup.track(() => platformPrisma.course.delete({ where: { id: c.id } }));
    }
    for (let i = 0; i < 2; i++) {
      const c = await platformPrisma.course.create({
        data: { tenantId: DEMO_ACADEMY_TENANT_ID, title: `${titleTag} Demo Academy Course ${i}`, createdById: admin.id },
      });
      cleanup.track(() => platformPrisma.course.delete({ where: { id: c.id } }));
    }
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("A tenant-scoped title search only ever matches that tenant's own courses, even with an identical search term", async () => {
    const [wqResults, daResults] = await Promise.all([
      asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async ({ prisma }) =>
        prisma.course.findMany({ where: { title: { contains: titleTag } } }),
      ),
      asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async ({ prisma }) =>
        prisma.course.findMany({ where: { title: { contains: titleTag } } }),
      ),
    ]);
    expect(wqResults).toHaveLength(3);
    expect(daResults).toHaveLength(2);
    expect(wqResults.every((c) => c.tenantId === WISDOMQUANT_TENANT_ID)).toBe(true);
    expect(daResults.every((c) => c.tenantId === DEMO_ACADEMY_TENANT_ID)).toBe(true);
  });

  it("Pagination (skip/take/orderBy) never lets Tenant B page into Tenant A's rows", async () => {
    const page = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async ({ prisma }) =>
      prisma.course.findMany({
        where: { title: { contains: titleTag } },
        orderBy: { title: "asc" },
        skip: 0,
        take: 10,
      }),
    );
    expect(page.every((c) => c.tenantId === DEMO_ACADEMY_TENANT_ID)).toBe(true);
  });

  it("count() aggregates are tenant-scoped (used for pagination totals/export row counts)", async () => {
    const [wqCount, daCount] = await Promise.all([
      asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async ({ prisma }) =>
        prisma.course.count({ where: { title: { contains: titleTag } } }),
      ),
      asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async ({ prisma }) =>
        prisma.course.count({ where: { title: { contains: titleTag } } }),
      ),
    ]);
    expect(wqCount).toBe(3);
    expect(daCount).toBe(2);
  });
});

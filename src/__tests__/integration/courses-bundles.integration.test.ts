import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

describe.skipIf(!hasStagingDb)("courses & bundles tenant isolation", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let adminA: string, adminB: string, courseA: string, courseB: string, bundleA: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();

    adminA = (
      await platformPrisma.user.create({ data: { name: "Admin A", email: `admin-a-${s}@test.local`, role: "ADMIN" } })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: adminA } }));
    adminB = (
      await platformPrisma.user.create({ data: { name: "Admin B", email: `admin-b-${s}@test.local`, role: "ADMIN" } })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: adminB } }));

    courseA = (
      await platformPrisma.course.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, title: `Course A ${s}`, createdById: adminA },
      })
    ).id;
    cleanup.track(() => platformPrisma.course.delete({ where: { id: courseA } }));
    courseB = (
      await platformPrisma.course.create({
        data: { tenantId: DEMO_ACADEMY_TENANT_ID, title: `Course B ${s}`, createdById: adminB },
      })
    ).id;
    cleanup.track(() => platformPrisma.course.delete({ where: { id: courseB } }));

    bundleA = (
      await platformPrisma.courseBundle.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, name: `Bundle A ${s}`, slug: `bundle-a-${s}`, createdById: adminA },
      })
    ).id;
    cleanup.track(() => platformPrisma.courseBundle.delete({ where: { id: bundleA } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("Tenant A can read its own course", async () => {
    const found = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.course.findUnique({ where: { id: courseA } });
    });
    expect(found?.id).toBe(courseA);
  });

  it("Tenant B reading Tenant A's course by id returns null (not the other tenant's row)", async () => {
    const found = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.course.findUnique({ where: { id: courseA } });
    });
    expect(found).toBeNull();
  });

  it("Tenant B updating Tenant A's course by id affects zero rows", async () => {
    const result = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.course.updateMany({ where: { id: courseA }, data: { title: "Hijacked" } });
    });
    expect(result.count).toBe(0);
    const stillIntact = await platformPrisma.course.findUnique({ where: { id: courseA } });
    expect(stillIntact?.title).not.toBe("Hijacked");
  });

  it("Tenant B deleting Tenant A's course by id affects zero rows", async () => {
    const result = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.course.deleteMany({ where: { id: courseA } });
    });
    expect(result.count).toBe(0);
    const stillExists = await platformPrisma.course.findUnique({ where: { id: courseA } });
    expect(stillExists).not.toBeNull();
  });

  it("Tenant B enumerating courses never includes Tenant A's course", async () => {
    const list = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.course.findMany({});
    });
    expect(list.some((c) => c.id === courseA)).toBe(false);
  });

  it("Creating a course while scoped as Tenant A always stamps Tenant A's id, ignoring any other tenantId in args", async () => {
    const created = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { prisma } = await loadPrismaModule();
      // Even if calling code tried to pass a different tenantId, the
      // extension must override it with the ambient tenant.
      return prisma.course.create({
        data: { tenantId: DEMO_ACADEMY_TENANT_ID, title: "Should be WisdomQuant", createdById: adminA },
      });
    });
    expect(created.tenantId).toBe(WISDOMQUANT_TENANT_ID);
    cleanup.track(() => platformPrisma.course.delete({ where: { id: created.id } }));
    await cleanup.run();
  });

  it("Tenant B cannot read Tenant A's bundle by id", async () => {
    const found = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.courseBundle.findUnique({ where: { id: bundleA } });
    });
    expect(found).toBeNull();
  });
});

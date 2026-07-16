import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

describe.skipIf(!hasStagingDb)("Enrollments, cart, orders & payments tenant isolation", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let adminA: string, learnerA: string, courseA: string, enrollmentA: string, orderA: string, couponA: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();

    adminA = (await platformPrisma.user.create({ data: { name: "Admin", email: `ec-admin-${s}@test.local`, role: "ADMIN" } })).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: adminA } }));
    learnerA = (await platformPrisma.user.create({ data: { name: "Learner", email: `ec-learner-${s}@test.local`, role: "STUDENT" } })).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: learnerA } }));

    courseA = (
      await platformPrisma.course.create({ data: { tenantId: WISDOMQUANT_TENANT_ID, title: `EC Course ${s}`, createdById: adminA } })
    ).id;
    cleanup.track(() => platformPrisma.course.delete({ where: { id: courseA } }));

    enrollmentA = (
      await platformPrisma.enrollment.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, userId: learnerA, courseId: courseA, source: "DIRECT" },
      })
    ).id;
    cleanup.track(() => platformPrisma.enrollment.delete({ where: { id: enrollmentA } }));

    orderA = (
      await platformPrisma.order.create({
        data: {
          tenantId: WISDOMQUANT_TENANT_ID,
          orderNumber: `EC-ORD-${s}`,
          userId: learnerA,
          status: "PAID",
          currency: "INR",
          subtotal: "999.00",
          totalAmount: "999.00",
          paymentMethod: "RAZORPAY",
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.order.delete({ where: { id: orderA } }));

    couponA = (
      await platformPrisma.coupon.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, code: `EC-CPN-${s}`, type: "PERCENTAGE", value: "10.00", createdById: adminA },
      })
    ).id;
    cleanup.track(() => platformPrisma.coupon.delete({ where: { id: couponA } }));

    const cart = await platformPrisma.cart.create({ data: { tenantId: WISDOMQUANT_TENANT_ID, userId: learnerA } });
    cleanup.track(() => platformPrisma.cart.delete({ where: { id: cart.id } }));
    await platformPrisma.cartItem.create({
      data: { tenantId: WISDOMQUANT_TENANT_ID, cartId: cart.id, itemType: "COURSE", courseId: courseA },
    });
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("Tenant B cannot see Tenant A's enrollment for course access checks", async () => {
    const found = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.enrollment.findFirst({ where: { userId: learnerA, courseId: courseA } });
    });
    expect(found).toBeNull();
  });

  it("Tenant B cannot read Tenant A's order/cart/coupon by id", async () => {
    const [order, coupon] = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async ({ prisma }) =>
      Promise.all([prisma.order.findUnique({ where: { id: orderA } }), prisma.coupon.findUnique({ where: { id: couponA } })]),
    );
    expect(order).toBeNull();
    expect(coupon).toBeNull();
  });

  it("Tenant B's cart listing never includes Tenant A's cart items", async () => {
    const items = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.cartItem.findMany({ where: { courseId: courseA } });
    });
    expect(items).toHaveLength(0);
  });

  it("Tenant B cannot cancel/refund Tenant A's order via updateMany", async () => {
    const result = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.order.updateMany({ where: { id: orderA }, data: { status: "REFUNDED" } });
    });
    expect(result.count).toBe(0);
    const stillPaid = await platformPrisma.order.findUnique({ where: { id: orderA } });
    expect(stillPaid?.status).toBe("PAID");
  });

  it("Tenant A's own scoped queries see all of its own commerce data", async () => {
    const [order, enrollment] = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { prisma } = await loadPrismaModule();
      return Promise.all([
        prisma.order.findUnique({ where: { id: orderA } }),
        prisma.enrollment.findUnique({ where: { id: enrollmentA } }),
      ]);
    });
    expect(order?.id).toBe(orderA);
    expect(enrollment?.id).toBe(enrollmentA);
  });
});

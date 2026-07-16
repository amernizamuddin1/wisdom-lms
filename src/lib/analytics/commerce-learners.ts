import "server-only";
import { prisma } from "@/lib/prisma";

export type LearnerCommercialProfile = {
  userId: string;
  lifetimeNetSpend: number;
  purchaseCount: number;
  averageOrderValue: number;
  isRepeatBuyer: boolean;
  discountsUsed: number;
  refundCount: number;
  refundAmount: number;
  lastPurchaseAt: Date | null;
  completionRate: number;
};

// Lifetime (not range-scoped) commercial snapshot for a single learner —
// used by the admin learner-detail drawer, not a bulk/table query, so this
// is a single-user fan-out of small queries rather than the bulk
// getPaidOrderItems() join the rest of Phase 3 relies on.
export async function getLearnerCommercialProfile(userId: string): Promise<LearnerCommercialProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return null;

  const [orders, refunds, activeEnrollments] = await Promise.all([
    prisma.order.findMany({
      where: { userId, status: "PAID" },
      select: {
        totalAmount: true,
        paidAt: true,
        couponId: true,
        couponDiscountAmount: true,
        items: { select: { originalPrice: true, finalPrice: true } },
      },
    }),
    prisma.refund.findMany({ where: { order: { userId } }, select: { amount: true } }),
    prisma.enrollment.findMany({ where: { userId, status: "ACTIVE" }, select: { courseId: true } }),
  ]);

  const purchaseCount = orders.length;
  // Gross (not net) total is the AOV denominator per the task spec — net
  // spend below subtracts refunds separately, so AOV isn't refund-adjusted.
  const grossTotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const refundAmount = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const lifetimeNetSpend = grossTotal - refundAmount;
  const averageOrderValue = purchaseCount === 0 ? 0 : Math.round((grossTotal / purchaseCount) * 100) / 100;

  const itemDiscounts = orders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + Math.max(0, Number(i.originalPrice) - Number(i.finalPrice)), 0),
    0,
  );
  const couponDiscounts = orders.reduce((s, o) => s + (o.couponId ? Number(o.couponDiscountAmount) : 0), 0);
  const discountsUsed = itemDiscounts + couponDiscounts;

  const lastPurchaseAt = orders.reduce<Date | null>((latest, o) => {
    if (!o.paidAt) return latest;
    return !latest || o.paidAt > latest ? o.paidAt : latest;
  }, null);

  const courseIds = activeEnrollments.map((e) => e.courseId);
  // Deduped by courseId rather than a raw event count, so a course somehow
  // completed twice (re-triggered event) doesn't push completionRate past 100%.
  const completedCourseIds =
    courseIds.length === 0
      ? []
      : await prisma.userActivityEvent.findMany({
          where: { userId, type: "COURSE_COMPLETED", courseId: { in: courseIds } },
          select: { courseId: true },
        });
  const completedCount = new Set(completedCourseIds.map((r) => r.courseId)).size;
  const completionRate = courseIds.length === 0 ? 0 : Math.round((completedCount / courseIds.length) * 1000) / 10;

  return {
    userId,
    lifetimeNetSpend,
    purchaseCount,
    averageOrderValue,
    isRepeatBuyer: purchaseCount >= 2,
    discountsUsed,
    refundCount: refunds.length,
    refundAmount,
    lastPurchaseAt,
    completionRate,
  };
}

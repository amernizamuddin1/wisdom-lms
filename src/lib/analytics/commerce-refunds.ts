import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ResolvedRange } from "./date-range";
import { ANALYTICS_ROW_CAP, getCourseItemIds } from "./shared";

export type RefundReasonBreakdown = {
  reason: string;
  count: number;
  totalAmount: number;
};

export type RefundRow = {
  orderId: string;
  orderNumber: string;
  itemTitles: string;
  amount: number;
  reason: string | null;
  daysToRefund: number | null;
  refundedAt: Date;
  issuedByName: string;
};

export type LearnerCourseProgressSnapshot = {
  courseId: string;
  title: string;
  progressPercent: number;
};

export type LearnerProgressAtRefund = {
  refundId: string;
  userId: string;
  courseProgress: LearnerCourseProgressSnapshot[];
};

export type RefundMetricsResult = {
  refundCount: number;
  totalRefundAmount: number;
  refundRate: number;
  averageDaysToRefund: number | null;
  reasonBreakdown: RefundReasonBreakdown[];
  rows: RefundRow[];
  learnerProgressAtRefund: LearnerProgressAtRefund[];
};

// Admin refund table + KPI source. Refund volume is expected to stay far
// below ANALYTICS_ROW_CAP in practice (see definitions.ts), but the cap is
// still applied for consistency with every other raw-row fetch in this
// directory rather than carving out a silent exception here.
export async function getRefundMetrics(range: ResolvedRange): Promise<RefundMetricsResult> {
  const [refunds, grossAgg] = await Promise.all([
    prisma.refund.findMany({
      where: { refundedAt: { gte: range.from, lte: range.to } },
      include: {
        order: { include: { items: true, user: true } },
        issuedByAdmin: { select: { name: true } },
      },
      orderBy: { refundedAt: "desc" },
      take: ANALYTICS_ROW_CAP,
    }),
    // Denominator for refundRate — gross PAID revenue in the same window
    // (definitions.ts: refundRate isn't a fraction of the refunded orders'
    // own totals, it's refunds against the period's overall paid revenue).
    prisma.order.aggregate({
      where: { status: "PAID", paidAt: { gte: range.from, lte: range.to } },
      _sum: { totalAmount: true },
    }),
  ]);

  const refundCount = refunds.length;
  const totalRefundAmount = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const grossPaidRevenue = Number(grossAgg._sum.totalAmount ?? 0);
  const refundRate = grossPaidRevenue === 0 ? 0 : Math.round((totalRefundAmount / grossPaidRevenue) * 1000) / 10;

  const daysToRefundList: number[] = [];
  const reasonMap = new Map<string, { count: number; totalAmount: number }>();
  const rows: RefundRow[] = [];

  for (const r of refunds) {
    const paidAt = r.order.paidAt;
    const daysToRefund = paidAt ? Math.round(((r.refundedAt.getTime() - paidAt.getTime()) / 86400000) * 10) / 10 : null;
    if (daysToRefund !== null) daysToRefundList.push(daysToRefund);

    const reasonKey = r.reason && r.reason.trim() !== "" ? r.reason : "Not specified";
    const bucket = reasonMap.get(reasonKey) ?? { count: 0, totalAmount: 0 };
    bucket.count += 1;
    bucket.totalAmount += Number(r.amount);
    reasonMap.set(reasonKey, bucket);

    rows.push({
      orderId: r.orderId,
      orderNumber: r.order.orderNumber,
      itemTitles: r.order.items.map((i) => i.titleSnapshot).join(", "),
      amount: Number(r.amount),
      reason: r.reason,
      daysToRefund,
      refundedAt: r.refundedAt,
      issuedByName: r.issuedByAdmin.name,
    });
  }

  const averageDaysToRefund =
    daysToRefundList.length === 0
      ? null
      : Math.round((daysToRefundList.reduce((s, d) => s + d, 0) / daysToRefundList.length) * 10) / 10;

  const reasonBreakdown: RefundReasonBreakdown[] = [...reasonMap.entries()].map(([reason, v]) => ({
    reason,
    count: v.count,
    totalAmount: v.totalAmount,
  }));

  const learnerProgressAtRefund = await computeLearnerProgressAtRefund(refunds);

  return { refundCount, totalRefundAmount, refundRate, averageDaysToRefund, reasonBreakdown, rows, learnerProgressAtRefund };
}

type RefundWithOrder = Prisma.RefundGetPayload<{
  include: { order: { include: { items: true; user: true } }; issuedByAdmin: { select: { name: true } } };
}>;

// Best-effort progress snapshot for the buyer's course-type items on a
// refunded order. This reflects CURRENT progress, not progress at the
// moment of refund, since no historical LessonProgress-at-refund-time
// snapshot exists anywhere in the schema (Refund only stores amount/reason/
// timestamps, not a progress copy) — treat as directional, not exact.
async function computeLearnerProgressAtRefund(refunds: RefundWithOrder[]): Promise<LearnerProgressAtRefund[]> {
  const progressCache = new Map<string, number>();
  const results: LearnerProgressAtRefund[] = [];

  for (const r of refunds) {
    const userId = r.order.userId;
    const courseItems = r.order.items.filter((i) => i.itemType === "COURSE" && i.courseId);
    if (courseItems.length === 0) continue;

    const courseProgress: LearnerCourseProgressSnapshot[] = [];
    for (const item of courseItems) {
      const courseId = item.courseId as string;
      const cacheKey = `${userId}:${courseId}`;
      let percent = progressCache.get(cacheKey);
      if (percent === undefined) {
        const { lessonIds } = await getCourseItemIds(courseId);
        if (lessonIds.length === 0) {
          percent = 0;
        } else {
          const completedCount = await prisma.lessonProgress.count({
            where: { userId, lessonId: { in: lessonIds }, completedAt: { not: null } },
          });
          percent = Math.round((completedCount / lessonIds.length) * 1000) / 10;
        }
        progressCache.set(cacheKey, percent);
      }
      courseProgress.push({ courseId, title: item.titleSnapshot, progressPercent: percent });
    }

    results.push({ refundId: r.id, userId, courseProgress });
  }

  return results;
}

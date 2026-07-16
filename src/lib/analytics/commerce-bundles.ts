import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { classifyCourseEnrollments } from "./funnel";
import { getPaidOrderItems, distinctOrderCount, currencyLabelFor } from "./commerce-shared";

export type BundleCourseComparisonRow = {
  courseId: string;
  title: string;
  startedRateViaBundle: number;
  startedRateViaDirect: number;
};

export type BundlePerformanceRow = {
  bundleId: string;
  name: string;
  currencyLabel: string;
  sales: number;
  revenue: number;
  conversionRate: number;
  averageSellingPrice: number;
  coursesStartedAfterPurchase: number;
  coursesCompletedAfterPurchase: number;
  bundleUtilization: number;
  bundleVsStandaloneComparison: BundleCourseComparisonRow[];
};

// Bundle utilization and started/completed-after-purchase are lifetime
// attributes of current bundle holders (see definitions.ts's Bundle
// utilization entry) — deliberately NOT range-scoped, unlike sales/revenue/
// conversion which describe activity within the selected window.
async function bundleUtilizationAndComparison(
  bundleId: string,
  memberCourseIds: string[],
): Promise<{
  coursesStartedAfterPurchase: number;
  coursesCompletedAfterPurchase: number;
  bundleUtilization: number;
  bundleVsStandaloneComparison: BundleCourseComparisonRow[];
}> {
  const [holders, memberCourses, classifications] = await Promise.all([
    prisma.bundleEnrollment.findMany({ where: { bundleId, status: "ACTIVE" }, select: { userId: true } }),
    prisma.course.findMany({ where: { id: { in: memberCourseIds } }, select: { id: true, title: true } }),
    Promise.all(memberCourseIds.map((cid) => classifyCourseEnrollments(cid))),
  ]);

  const holderIds = new Set(holders.map((h) => h.userId));
  const classifiedByCourse = new Map(memberCourseIds.map((cid, idx) => [cid, classifications[idx]]));

  // Per-course source lookup (DIRECT vs BUNDLE), used both to gate the
  // holder-only utilization stat below and to build the bundle-vs-standalone
  // comparison, so this only needs one Enrollment read per member course.
  const enrollmentsByCourse = await Promise.all(
    memberCourseIds.map((cid) =>
      prisma.enrollment.findMany({ where: { courseId: cid }, select: { userId: true, source: true } }),
    ),
  );
  const sourceByCourse = new Map(
    memberCourseIds.map((cid, idx) => [cid, new Map(enrollmentsByCourse[idx].map((e) => [e.userId, e.source]))]),
  );

  let coursesStartedAfterPurchase = 0;
  let coursesCompletedAfterPurchase = 0;
  let utilizationSum = 0;

  for (const holderId of holderIds) {
    let startedCount = 0;
    for (const cid of memberCourseIds) {
      const info = classifiedByCourse.get(cid)?.get(holderId);
      if (info?.started) {
        startedCount += 1;
        coursesStartedAfterPurchase += 1;
      }
      if (info?.completed) coursesCompletedAfterPurchase += 1;
    }
    utilizationSum += memberCourseIds.length === 0 ? 0 : startedCount / memberCourseIds.length;
  }
  const bundleUtilization = holderIds.size === 0 ? 0 : Math.round((utilizationSum / holderIds.size) * 1000) / 10;

  const bundleVsStandaloneComparison: BundleCourseComparisonRow[] = memberCourses.map((course) => {
    const classified = classifiedByCourse.get(course.id);
    const sourceMap = sourceByCourse.get(course.id);
    let bundleTotal = 0;
    let bundleStarted = 0;
    let directTotal = 0;
    let directStarted = 0;
    if (classified && sourceMap) {
      for (const [userId, source] of sourceMap) {
        const started = classified.get(userId)?.started ?? false;
        if (source === "BUNDLE") {
          bundleTotal += 1;
          if (started) bundleStarted += 1;
        } else if (source === "DIRECT") {
          directTotal += 1;
          if (started) directStarted += 1;
        }
      }
    }
    return {
      courseId: course.id,
      title: course.title,
      startedRateViaBundle: bundleTotal === 0 ? 0 : Math.round((bundleStarted / bundleTotal) * 1000) / 10,
      startedRateViaDirect: directTotal === 0 ? 0 : Math.round((directStarted / directTotal) * 1000) / 10,
    };
  });

  return { coursesStartedAfterPurchase, coursesCompletedAfterPurchase, bundleUtilization, bundleVsStandaloneComparison };
}

async function bundlePerformanceRow(bundleId: string, name: string, range: ResolvedRange): Promise<BundlePerformanceRow> {
  const [memberCourseRows, sales, paidItems, viewRows] = await Promise.all([
    prisma.bundleCourse.findMany({ where: { bundleId }, select: { courseId: true } }),
    prisma.bundleEnrollment.count({ where: { bundleId, enrolledAt: { gte: range.from, lte: range.to } } }),
    getPaidOrderItems(range, { bundleId }),
    prisma.commerceEvent.count({ where: { type: "PRODUCT_VIEWED", bundleId, createdAt: { gte: range.from, lte: range.to } } }),
  ]);
  const memberCourseIds = memberCourseRows.map((c) => c.courseId);

  const paidOrders = distinctOrderCount(paidItems);
  const revenue = paidItems.reduce((s, i) => s + i.finalPrice, 0);

  const utilization = await bundleUtilizationAndComparison(bundleId, memberCourseIds);

  return {
    bundleId,
    name,
    currencyLabel: currencyLabelFor(paidItems),
    sales,
    revenue,
    conversionRate: viewRows === 0 ? 0 : Math.round((paidOrders / viewRows) * 1000) / 10,
    averageSellingPrice: paidOrders === 0 ? 0 : Math.round((revenue / paidOrders) * 100) / 100,
    ...utilization,
  };
}

// Per-bundle commercial performance for the Bundles page. Bundle count is
// catalog-bounded (not learner-count-scaled), so per-bundle work is
// parallelized via Promise.all — same justification as courses.ts.
export async function getBundlePerformance(range: ResolvedRange): Promise<BundlePerformanceRow[]> {
  const bundles = await prisma.courseBundle.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return Promise.all(bundles.map((b) => bundlePerformanceRow(b.id, b.name, range)));
}

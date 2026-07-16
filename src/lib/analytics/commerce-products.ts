import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { getCoursePerformanceRows } from "./courses";
import { classifyCourseEnrollments } from "./funnel";
import {
  getPaidOrderItems,
  sumItemDiscounts,
  distinctOrderCount,
  currencyLabelFor,
} from "./commerce-shared";

export type ProductPerformanceRow = {
  id: string;
  title: string;
  itemType: "COURSE" | "BUNDLE";
  currencyLabel: string;
  views: number;
  enrollments: number;
  paidOrders: number;
  freeEnrollments: number;
  conversionRate: number;
  grossRevenue: number;
  netRevenue: number;
  averageSellingPrice: number;
  discounts: number;
  refunds: number;
  completionRate: number;
  engagementRate: number;
  revenuePerLearner: number;
};

// Refunds have no OrderItem-level granularity (see Refund model comment in
// schema.prisma), so a multi-item order's refund is attributed in full to
// every product in it — an approximation, not a decomposition. Callers
// should treat netRevenue as directional, not exact, for orders that mix
// products.
async function refundsForOrderIds(orderIds: string[]): Promise<number> {
  if (orderIds.length === 0) return 0;
  const refunds = await prisma.refund.findMany({
    where: { orderId: { in: orderIds } },
    select: { amount: true },
  });
  return refunds.reduce((sum, r) => sum + Number(r.amount), 0);
}

async function courseProductRow(
  courseId: string,
  title: string,
  range: ResolvedRange,
  completionByCourse: Map<string, number>,
): Promise<ProductPerformanceRow> {
  const [viewRows, enrollmentRows, freeEnrollmentCount, paidItems, classified] = await Promise.all([
    prisma.commerceEvent.findMany({
      where: { type: "PRODUCT_VIEWED", courseId, createdAt: { gte: range.from, lte: range.to } },
      select: { userId: true },
    }),
    prisma.enrollment.count({ where: { courseId, enrolledAt: { gte: range.from, lte: range.to } } }),
    prisma.enrollment.count({
      where: { courseId, source: "FREE_CHECKOUT", enrolledAt: { gte: range.from, lte: range.to } },
    }),
    getPaidOrderItems(range, { courseId }),
    classifyCourseEnrollments(courseId, { from: range.from, to: range.to }),
  ]);

  // PRODUCT_VIEWED only fires for authenticated visitors (see
  // definitions.ts's Phase 3 limitations note) — distinct-user count is the
  // best available proxy for "views" here, not a true pageview count.
  const views = new Set(viewRows.map((v) => v.userId).filter(Boolean)).size;
  const paidOrders = distinctOrderCount(paidItems);
  const grossRevenue = paidItems.reduce((s, i) => s + i.finalPrice, 0);
  const refunds = await refundsForOrderIds([...new Set(paidItems.map((i) => i.orderId))]);

  let startedCount = 0;
  for (const info of classified.values()) if (info.started) startedCount += 1;

  return {
    id: courseId,
    title,
    itemType: "COURSE",
    currencyLabel: currencyLabelFor(paidItems),
    views,
    enrollments: enrollmentRows,
    paidOrders,
    freeEnrollments: freeEnrollmentCount,
    // Labeled "authenticated-visitor conversion" per definitions.ts — views
    // only ever count authenticated visitors, never a site-wide rate.
    conversionRate: views === 0 ? 0 : Math.round((paidOrders / views) * 1000) / 10,
    grossRevenue,
    netRevenue: grossRevenue - refunds,
    averageSellingPrice: paidOrders === 0 ? 0 : Math.round((grossRevenue / paidOrders) * 100) / 100,
    discounts: sumItemDiscounts(paidItems),
    refunds,
    completionRate: completionByCourse.get(courseId) ?? 0,
    engagementRate: classified.size === 0 ? 0 : Math.round((startedCount / classified.size) * 1000) / 10,
    revenuePerLearner: enrollmentRows === 0 ? 0 : Math.round((grossRevenue / enrollmentRows) * 100) / 100,
  };
}

async function bundleProductRow(
  bundleId: string,
  title: string,
  range: ResolvedRange,
  completionByCourse: Map<string, number>,
): Promise<ProductPerformanceRow> {
  const memberCourseIds = (
    await prisma.bundleCourse.findMany({ where: { bundleId }, select: { courseId: true } })
  ).map((c) => c.courseId);

  const [viewRows, enrollmentCount, paidItems, memberClassifications] = await Promise.all([
    prisma.commerceEvent.findMany({
      where: { type: "PRODUCT_VIEWED", bundleId, createdAt: { gte: range.from, lte: range.to } },
      select: { userId: true },
    }),
    prisma.bundleEnrollment.count({ where: { bundleId, enrolledAt: { gte: range.from, lte: range.to } } }),
    getPaidOrderItems(range, { bundleId }),
    Promise.all(memberCourseIds.map((cid) => classifyCourseEnrollments(cid, { from: range.from, to: range.to }))),
  ]);

  const views = new Set(viewRows.map((v) => v.userId).filter(Boolean)).size;
  const paidOrders = distinctOrderCount(paidItems);
  const grossRevenue = paidItems.reduce((s, i) => s + i.finalPrice, 0);
  const refunds = await refundsForOrderIds([...new Set(paidItems.map((i) => i.orderId))]);

  // Bundles have no completion/engagement signal of their own — both are
  // averaged across member courses, same convention as bundleUtilization
  // (see commerce-bundles.ts).
  const memberCompletionRates = memberCourseIds.map((cid) => completionByCourse.get(cid) ?? 0);
  const completionRate =
    memberCompletionRates.length === 0
      ? 0
      : Math.round((memberCompletionRates.reduce((s, v) => s + v, 0) / memberCompletionRates.length) * 10) / 10;

  const engagementRates = memberClassifications.map((classified) => {
    if (classified.size === 0) return 0;
    let started = 0;
    for (const info of classified.values()) if (info.started) started += 1;
    return (started / classified.size) * 100;
  });
  const engagementRate =
    engagementRates.length === 0
      ? 0
      : Math.round((engagementRates.reduce((s, v) => s + v, 0) / engagementRates.length) * 10) / 10;

  return {
    id: bundleId,
    title,
    itemType: "BUNDLE",
    currencyLabel: currencyLabelFor(paidItems),
    views,
    enrollments: enrollmentCount,
    paidOrders,
    // BundleEnrollment has no `source` field (unlike Enrollment), so there is
    // no bundle-level equivalent of a FREE_CHECKOUT signal to report here.
    freeEnrollments: 0,
    conversionRate: views === 0 ? 0 : Math.round((paidOrders / views) * 1000) / 10,
    grossRevenue,
    netRevenue: grossRevenue - refunds,
    averageSellingPrice: paidOrders === 0 ? 0 : Math.round((grossRevenue / paidOrders) * 100) / 100,
    discounts: sumItemDiscounts(paidItems),
    refunds,
    completionRate,
    engagementRate,
    revenuePerLearner: enrollmentCount === 0 ? 0 : Math.round((grossRevenue / enrollmentCount) * 100) / 100,
  };
}

// Per-product (course + bundle) commercial performance table backing the
// Products page. Course and bundle catalogs are both small and bounded (not
// learner-count-scaled), so per-entity work is parallelized via Promise.all
// exactly like getCoursePerformanceRows in courses.ts — no rollup table
// needed at this scale.
export async function getProductPerformance(range: ResolvedRange, search?: string): Promise<ProductPerformanceRow[]> {
  const [courses, bundles, courseCompletionRows] = await Promise.all([
    prisma.course.findMany({
      where: search ? { title: { contains: search, mode: "insensitive" } } : {},
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.courseBundle.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Fetched once up front and indexed by courseId — calling
    // getCoursePerformanceRows per-course inside the loop below would be an
    // O(courses) x O(courses) fan-out instead of O(courses).
    getCoursePerformanceRows(null, range),
  ]);

  const completionByCourse = new Map(courseCompletionRows.map((r) => [r.courseId, r.completionRate]));

  const [courseRows, bundleRows] = await Promise.all([
    Promise.all(courses.map((c) => courseProductRow(c.id, c.title, range, completionByCourse))),
    Promise.all(bundles.map((b) => bundleProductRow(b.id, b.name, range, completionByCourse))),
  ]);

  return [...courseRows, ...bundleRows];
}

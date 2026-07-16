import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { ANALYTICS_ROW_CAP } from "./shared";

export type CourseFollowOnRow = {
  courseId: string;
  title: string;
  followOnPurchaseRate: number;
  sampleSize: number;
};

export type RepeatPurchaseMetrics = {
  firstTimeBuyers: number;
  repeatBuyers: number;
  repeatPurchaseRate: number;
  averageDaysToSecondPurchase: number | null;
  freeToPaidConversionEligible: number;
  freeToPaidConversionCount: number;
  freeToPaidConversionRate: number;
  coursesLeadingToFurtherPurchases: CourseFollowOnRow[];
};

const TOP_FOLLOW_ON_COURSES = 10;

// Repeat-buyer behavior is a lifetime learner attribute (definitions.ts:
// "Repeat buyer ... all-time, since 'repeat' is a lifetime learner
// attribute"), so every metric here is computed all-time. `range` is
// accepted only for interface consistency with the other Phase 3 modules
// (which all take a ResolvedRange for the shared filter bar) — it doesn't
// currently gate any of these queries, since narrowing "has this learner
// ever bought again" to a date window would misrepresent the metric.
export async function getRepeatPurchaseMetrics(_range: ResolvedRange): Promise<RepeatPurchaseMetrics> {
  const buyerGroups = await prisma.order.groupBy({
    by: ["userId"],
    where: { status: "PAID" },
    _count: true,
    orderBy: { userId: "asc" },
    take: ANALYTICS_ROW_CAP,
  });

  const firstTimeBuyers = buyerGroups.filter((g) => g._count === 1).length;
  const repeatBuyerIds = buyerGroups.filter((g) => g._count >= 2).map((g) => g.userId);
  const repeatBuyers = repeatBuyerIds.length;
  const totalBuyers = firstTimeBuyers + repeatBuyers;
  const repeatPurchaseRate = totalBuyers === 0 ? 0 : Math.round((repeatBuyers / totalBuyers) * 1000) / 10;

  const averageDaysToSecondPurchase = await computeAverageDaysToSecondPurchase(repeatBuyerIds);
  const { eligible, converted } = await computeFreeToPaidConversion();
  const freeToPaidConversionRate = eligible === 0 ? 0 : Math.round((converted / eligible) * 1000) / 10;

  const coursesLeadingToFurtherPurchases = await computeFollowOnPurchases();

  return {
    firstTimeBuyers,
    repeatBuyers,
    repeatPurchaseRate,
    averageDaysToSecondPurchase,
    freeToPaidConversionEligible: eligible,
    freeToPaidConversionCount: converted,
    freeToPaidConversionRate,
    coursesLeadingToFurtherPurchases,
  };
}

// Fetches the paidAt-ordered order history only for the (typically much
// smaller) repeat-buyer subset, rather than every paying user, and takes the
// gap between each user's 1st and 2nd paid order.
async function computeAverageDaysToSecondPurchase(repeatBuyerIds: string[]): Promise<number | null> {
  if (repeatBuyerIds.length === 0) return null;

  const orders = await prisma.order.findMany({
    where: { userId: { in: repeatBuyerIds }, status: "PAID" },
    select: { userId: true, paidAt: true },
    orderBy: { paidAt: "asc" },
    take: ANALYTICS_ROW_CAP,
  });

  const byUser = new Map<string, Date[]>();
  for (const o of orders) {
    if (!o.paidAt) continue;
    const list = byUser.get(o.userId) ?? [];
    list.push(o.paidAt);
    byUser.set(o.userId, list);
  }

  const gapsDays: number[] = [];
  for (const dates of byUser.values()) {
    if (dates.length < 2) continue;
    gapsDays.push((dates[1].getTime() - dates[0].getTime()) / 86400000);
  }

  return gapsDays.length === 0 ? null : Math.round((gapsDays.reduce((s, d) => s + d, 0) / gapsDays.length) * 10) / 10;
}

// Set A = learners with any signal of a free enrollment — either the
// EnrollmentSource.FREE_CHECKOUT flow, or an enrollment into a course
// flagged Course.isFree (definitions.ts's "or joined Course.isFree=true"
// clause) — unioned since either is evidence the learner started free.
async function computeFreeToPaidConversion(): Promise<{ eligible: number; converted: number }> {
  const [freeCheckoutRows, freeCourseRows] = await Promise.all([
    prisma.enrollment.findMany({ where: { source: "FREE_CHECKOUT" }, select: { userId: true }, distinct: ["userId"] }),
    prisma.enrollment.findMany({ where: { course: { isFree: true } }, select: { userId: true }, distinct: ["userId"] }),
  ]);

  const setA = new Set<string>([...freeCheckoutRows.map((r) => r.userId), ...freeCourseRows.map((r) => r.userId)]);
  if (setA.size === 0) return { eligible: 0, converted: 0 };

  const paidRows = await prisma.order.findMany({
    where: { userId: { in: [...setA] }, status: "PAID" },
    select: { userId: true },
    distinct: ["userId"],
  });

  return { eligible: setA.size, converted: paidRows.length };
}

// For every course, of the learners ever enrolled in it (any source), what
// fraction placed a PAID order for a *different* course or a bundle after
// their enrolledAt in this course — a proxy for "this course leads to
// further purchases." Catalog-bounded (courses + paid items), same
// small-catalog assumption as courses.ts's getCoursePerformanceRows.
async function computeFollowOnPurchases(): Promise<CourseFollowOnRow[]> {
  const [courses, enrollments, paidItems] = await Promise.all([
    prisma.course.findMany({ select: { id: true, title: true } }),
    prisma.enrollment.findMany({ select: { userId: true, courseId: true, enrolledAt: true }, take: ANALYTICS_ROW_CAP }),
    prisma.orderItem.findMany({
      where: { order: { status: "PAID" } },
      select: { courseId: true, bundleId: true, order: { select: { userId: true, paidAt: true } } },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  const paidByUser = new Map<string, { courseId: string | null; bundleId: string | null; paidAt: Date | null }[]>();
  for (const item of paidItems) {
    const list = paidByUser.get(item.order.userId) ?? [];
    list.push({ courseId: item.courseId, bundleId: item.bundleId, paidAt: item.order.paidAt });
    paidByUser.set(item.order.userId, list);
  }

  const enrollmentsByCourse = new Map<string, { userId: string; enrolledAt: Date }[]>();
  for (const e of enrollments) {
    const list = enrollmentsByCourse.get(e.courseId) ?? [];
    list.push({ userId: e.userId, enrolledAt: e.enrolledAt });
    enrollmentsByCourse.set(e.courseId, list);
  }

  const rows: CourseFollowOnRow[] = [];
  for (const course of courses) {
    const enrolledUsers = enrollmentsByCourse.get(course.id) ?? [];
    if (enrolledUsers.length === 0) continue;

    let followOnCount = 0;
    for (const { userId, enrolledAt } of enrolledUsers) {
      const purchases = paidByUser.get(userId) ?? [];
      const hasFollowOn = purchases.some(
        (p) => p.paidAt && p.paidAt.getTime() > enrolledAt.getTime() && (p.bundleId || p.courseId !== course.id),
      );
      if (hasFollowOn) followOnCount += 1;
    }

    rows.push({
      courseId: course.id,
      title: course.title,
      followOnPurchaseRate: Math.round((followOnCount / enrolledUsers.length) * 1000) / 10,
      sampleSize: enrolledUsers.length,
    });
  }

  return rows.sort((a, b) => b.followOnPurchaseRate - a.followOnPurchaseRate).slice(0, TOP_FOLLOW_ON_COURSES);
}

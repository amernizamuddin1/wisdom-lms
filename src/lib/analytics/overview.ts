import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey, changePercent, type ResolvedRange } from "./date-range";
import { downsample, ANALYTICS_ROW_CAP } from "./shared";
import { countTenantStudents } from "./tenant-learners";

export type OverviewFilters = { range: ResolvedRange; courseId: string | null };

export type KpiValue = {
  value: number;
  previousValue: number | null;
  changePercent: number | null;
  sparkline: number[];
};

export type OverviewKpis = {
  totalLearners: KpiValue;
  activeLearners: KpiValue;
  totalEnrollments: KpiValue;
  courseCompletions: KpiValue;
  completionRate: KpiValue;
  totalLearningTimeSeconds: KpiValue;
  averageQuizScore: KpiValue;
  revenue: KpiValue & { currencyLabel: string };
};

async function totalLearnersAsOf(cutoff: Date, courseId: string | null): Promise<number> {
  if (courseId) {
    return prisma.enrollment
      .findMany({
        where: { courseId, status: "ACTIVE", enrolledAt: { lte: cutoff } },
        distinct: ["userId"],
        select: { userId: true },
      })
      .then((r) => r.length);
  }
  return countTenantStudents({ createdAt: { lte: cutoff } });
}

async function activeLearnerCount(from: Date, to: Date, courseId: string | null): Promise<number> {
  const fromKey = dateKey(from);
  const toKey = dateKey(to);
  if (!courseId) {
    const rows = await prisma.userDailyLearningActivity.findMany({
      where: { activityDate: { gte: fromKey, lte: toKey }, isQualifyingDay: true },
      distinct: ["userId"],
      select: { userId: true },
    });
    return rows.length;
  }
  const [lessonUsers, quizUsers, timeUsers] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { completedAt: { gte: from, lte: to }, lesson: { chapter: { courseId } } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { attemptedAt: { gte: from, lte: to }, OR: [{ quiz: { courseId } }, { quiz: { chapter: { courseId } } }] },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userCourseLearningTime.findMany({
      where: { courseId, lastActivityAt: { gte: from, lte: to } },
      select: { userId: true },
    }),
  ]);
  return new Set([...lessonUsers, ...quizUsers, ...timeUsers].map((r) => r.userId)).size;
}

async function enrollmentCount(from: Date, to: Date, courseId: string | null): Promise<number> {
  return prisma.enrollment.count({
    where: { status: "ACTIVE", enrolledAt: { gte: from, lte: to }, ...(courseId ? { courseId } : {}) },
  });
}

async function completionCount(from: Date, to: Date, courseId: string | null): Promise<number> {
  return prisma.userActivityEvent.count({
    where: { type: "COURSE_COMPLETED", createdAt: { gte: from, lte: to }, ...(courseId ? { courseId } : {}) },
  });
}

async function learningTimeSeconds(from: Date, to: Date, courseId: string | null): Promise<number> {
  if (!courseId) {
    const agg = await prisma.userDailyLearningActivity.aggregate({
      where: { activityDate: { gte: dateKey(from), lte: dateKey(to) } },
      _sum: { learningTimeSeconds: true },
    });
    return agg._sum.learningTimeSeconds ?? 0;
  }
  // Course-scoped learning time is all-time (see definitions.ts) — the range
  // is ignored here deliberately, callers must label this "All-time".
  const agg = await prisma.userCourseLearningTime.aggregate({
    where: { courseId },
    _sum: { learningTimeSeconds: true },
  });
  return agg._sum.learningTimeSeconds ?? 0;
}

async function averageQuizScore(from: Date, to: Date, courseId: string | null): Promise<number | null> {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      attemptedAt: { gte: from, lte: to },
      ...(courseId ? { OR: [{ quiz: { courseId } }, { quiz: { chapter: { courseId } } }] } : {}),
    },
    select: { userId: true, quizId: true, score: true },
    take: ANALYTICS_ROW_CAP,
  });
  if (attempts.length === 0) return null;
  const bestByUserQuiz = new Map<string, number>();
  for (const a of attempts) {
    const key = `${a.userId}:${a.quizId}`;
    bestByUserQuiz.set(key, Math.max(bestByUserQuiz.get(key) ?? 0, a.score));
  }
  const values = [...bestByUserQuiz.values()];
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function currencyLabelFor(currencies: Set<string>): string {
  return currencies.size === 0 ? "" : currencies.size === 1 ? [...currencies][0] : "Mixed currencies";
}

async function revenueTotal(from: Date, to: Date, courseId: string | null): Promise<{ value: number; currencyLabel: string }> {
  // Course-scoped revenue must sum the matching OrderItem's finalPrice (the actual
  // charged, post-discount line-item amount), not the whole Order.totalAmount — an
  // order can bundle other courses/items, and Order.totalAmount would then overstate
  // this course's revenue by whatever else was in the same checkout.
  if (courseId) {
    const items = await prisma.orderItem.findMany({
      where: { itemType: "COURSE", courseId, order: { status: "PAID", paidAt: { gte: from, lte: to } } },
      select: { finalPrice: true, order: { select: { currency: true } } },
    });
    const currencies = new Set(items.map((i) => i.order.currency));
    const value = items.reduce((s, i) => s + Number(i.finalPrice), 0);
    return { value, currencyLabel: currencyLabelFor(currencies) };
  }

  const orders = await prisma.order.findMany({
    where: { status: "PAID", paidAt: { gte: from, lte: to } },
    select: { totalAmount: true, currency: true },
  });
  const currencies = new Set(orders.map((o) => o.currency));
  const value = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  return { value, currencyLabel: currencyLabelFor(currencies) };
}

function kpi(value: number, previousValue: number | null, sparkline: number[]): KpiValue {
  return {
    value,
    previousValue,
    changePercent: previousValue === null ? null : changePercent(value, previousValue),
    sparkline,
  };
}

export async function getOverviewKpis({ range, courseId }: OverviewFilters): Promise<OverviewKpis> {
  const { from, to, previousFrom, previousTo } = range;

  const [
    totalLearnersNow,
    totalLearnersPrev,
    activeNow,
    activePrev,
    enrollNow,
    enrollPrev,
    completeNow,
    completePrev,
    timeNow,
    timePrev,
    quizNow,
    quizPrev,
    revNow,
    revPrev,
    trend,
  ] = await Promise.all([
    totalLearnersAsOf(to, courseId),
    totalLearnersAsOf(previousTo, courseId),
    activeLearnerCount(from, to, courseId),
    activeLearnerCount(previousFrom, previousTo, courseId),
    enrollmentCount(from, to, courseId),
    enrollmentCount(previousFrom, previousTo, courseId),
    completionCount(from, to, courseId),
    completionCount(previousFrom, previousTo, courseId),
    learningTimeSeconds(from, to, courseId),
    learningTimeSeconds(previousFrom, previousTo, courseId),
    averageQuizScore(from, to, courseId),
    averageQuizScore(previousFrom, previousTo, courseId),
    revenueTotal(from, to, courseId),
    revenueTotal(previousFrom, previousTo, courseId),
    getActivityTrend({ range, courseId }),
  ]);

  const completionRateNow = enrollNow === 0 ? 0 : Math.round((completeNow / enrollNow) * 1000) / 10;
  const completionRatePrev = enrollPrev === 0 ? null : Math.round((completePrev / enrollPrev) * 1000) / 10;

  const activeSpark = downsample(trend.map((t) => t.activeLearners));
  const enrollSpark = downsample(trend.map((t) => t.lessonsCompleted > 0 ? t.lessonsCompleted : 0));
  const timeSpark = downsample(trend.map((t) => Math.round(t.learningHours * 60)));

  return {
    totalLearners: kpi(totalLearnersNow, totalLearnersPrev, []),
    activeLearners: kpi(activeNow, activePrev, activeSpark),
    totalEnrollments: kpi(enrollNow, enrollPrev, enrollSpark),
    courseCompletions: kpi(completeNow, completePrev, []),
    completionRate: kpi(completionRateNow, completionRatePrev, []),
    totalLearningTimeSeconds: kpi(timeNow, timePrev, timeSpark),
    averageQuizScore: kpi(quizNow ?? 0, quizPrev, []),
    revenue: { ...kpi(revNow.value, revPrev.value, []), currencyLabel: revNow.currencyLabel || revPrev.currencyLabel },
  };
}

export type TrendPoint = { date: string; activeLearners: number; lessonsCompleted: number; learningHours: number };

export async function getActivityTrend({ range, courseId }: OverviewFilters): Promise<TrendPoint[]> {
  const { from, to } = range;

  if (!courseId) {
    const rows = await prisma.userDailyLearningActivity.findMany({
      where: { activityDate: { gte: dateKey(from), lte: dateKey(to) } },
      select: { activityDate: true, isQualifyingDay: true, lessonsCompleted: true, learningTimeSeconds: true, userId: true },
    });
    const byDay = new Map<string, { active: Set<string>; lessons: number; seconds: number }>();
    for (const r of rows) {
      const bucket = byDay.get(r.activityDate) ?? { active: new Set<string>(), lessons: 0, seconds: 0 };
      if (r.isQualifyingDay) bucket.active.add(r.userId);
      bucket.lessons += r.lessonsCompleted;
      bucket.seconds += r.learningTimeSeconds;
      byDay.set(r.activityDate, bucket);
    }
    return buildDaySeries(from, to, (key) => {
      const b = byDay.get(key);
      return { activeLearners: b?.active.size ?? 0, lessonsCompleted: b?.lessons ?? 0, learningHours: (b?.seconds ?? 0) / 3600 };
    });
  }

  const [lessonEvents, quizEvents] = await Promise.all([
    prisma.userActivityEvent.findMany({
      where: { type: "LESSON_COMPLETED", createdAt: { gte: from, lte: to }, courseId },
      select: { createdAt: true, userId: true },
      take: ANALYTICS_ROW_CAP,
    }),
    prisma.userActivityEvent.findMany({
      where: { type: { in: ["QUIZ_COMPLETED"] }, createdAt: { gte: from, lte: to }, courseId },
      select: { createdAt: true, userId: true },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  const byDay = new Map<string, { active: Set<string>; lessons: number }>();
  for (const e of lessonEvents) {
    const key = dateKey(e.createdAt);
    const bucket = byDay.get(key) ?? { active: new Set<string>(), lessons: 0 };
    bucket.active.add(e.userId);
    bucket.lessons += 1;
    byDay.set(key, bucket);
  }
  for (const e of quizEvents) {
    const key = dateKey(e.createdAt);
    const bucket = byDay.get(key) ?? { active: new Set<string>(), lessons: 0 };
    bucket.active.add(e.userId);
    byDay.set(key, bucket);
  }

  // Learning-hours-by-day has no per-course time-series source (only an
  // all-time cumulative total — see definitions.ts), so it's reported as 0
  // here; the UI disables that toggle when a specific course is selected.
  return buildDaySeries(from, to, (key) => {
    const b = byDay.get(key);
    return { activeLearners: b?.active.size ?? 0, lessonsCompleted: b?.lessons ?? 0, learningHours: 0 };
  });
}

function buildDaySeries(
  from: Date,
  to: Date,
  getPoint: (dateKeyStr: string) => Omit<TrendPoint, "date">,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = dateKey(cursor);
    points.push({ date: key, ...getPoint(key) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

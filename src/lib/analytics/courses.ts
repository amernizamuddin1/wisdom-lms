import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { classifyCourseEnrollments } from "./funnel";
import { ANALYTICS_ROW_CAP } from "./shared";

export type CoursePerformanceRow = {
  courseId: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  learningStatus: "ACTIVE" | "PAUSED";
  totalEnrollments: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  averageProgress: number;
  learningTimeSeconds: number;
  averageQuizScore: number | null;
  revenue: number;
  currencyLabel: string;
};

// Sums the matching OrderItem's finalPrice (the actual charged, post-discount
// line-item amount) rather than the whole Order.totalAmount — an order can
// bundle other courses/items in the same checkout, and Order.totalAmount would
// then overstate this course's revenue by whatever else was purchased with it.
async function courseRevenue(courseId: string): Promise<{ value: number; currencyLabel: string }> {
  const items = await prisma.orderItem.findMany({
    where: { itemType: "COURSE", courseId, order: { status: "PAID" } },
    select: { finalPrice: true, order: { select: { currency: true } } },
  });
  const currencies = new Set(items.map((i) => i.order.currency));
  const value = items.reduce((s, i) => s + Number(i.finalPrice), 0);
  const currencyLabel = currencies.size === 0 ? "" : currencies.size === 1 ? [...currencies][0] : "Mixed";
  return { value, currencyLabel };
}

async function courseAverageQuizScore(courseId: string): Promise<number | null> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { OR: [{ quiz: { courseId } }, { quiz: { chapter: { courseId } } }] },
    select: { userId: true, quizId: true, score: true },
    take: ANALYTICS_ROW_CAP,
  });
  if (attempts.length === 0) return null;
  const best = new Map<string, number>();
  for (const a of attempts) {
    const key = `${a.userId}:${a.quizId}`;
    best.set(key, Math.max(best.get(key) ?? 0, a.score));
  }
  const values = [...best.values()];
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

// courseId = null returns every course (used by the overview's Course
// Performance Table); pass a single course id to scope to just that row
// (used when the global course filter is applied on the overview page).
export async function getCoursePerformanceRows(
  courseId: string | null,
  enrolledRange?: ResolvedRange,
  search?: string,
): Promise<CoursePerformanceRow[]> {
  const courses = await prisma.course.findMany({
    where: {
      ...(courseId ? { id: courseId } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    select: { id: true, title: true, status: true, learningStatus: true },
    orderBy: { title: "asc" },
  });

  // Course count is naturally small (bounded by the catalog, not learner
  // count), so running these per-course lookups in parallel rather than one
  // giant query is the right-sized fix here — no rollup table needed at this
  // scale (see analytics scalability notes: revisit past ~500 courses).
  const rows = await Promise.all(
    courses.map(async (course) => {
      const range = enrolledRange ? { from: enrolledRange.from, to: enrolledRange.to } : undefined;
      const [classified, learningTime, revenue, avgQuizScore] = await Promise.all([
        classifyCourseEnrollments(course.id, range),
        prisma.userCourseLearningTime.aggregate({
          where: { courseId: course.id },
          _sum: { learningTimeSeconds: true },
        }),
        courseRevenue(course.id),
        courseAverageQuizScore(course.id),
      ]);

      const total = classified.size;
      let notStarted = 0;
      let inProgress = 0;
      let completed = 0;
      let progressSum = 0;
      for (const info of classified.values()) {
        progressSum += info.percent;
        if (info.completed) completed += 1;
        else if (info.started) inProgress += 1;
        else notStarted += 1;
      }

      return {
        courseId: course.id,
        title: course.title,
        status: course.status,
        learningStatus: course.learningStatus,
        totalEnrollments: total,
        notStarted,
        inProgress,
        completed,
        completionRate: total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
        averageProgress: total === 0 ? 0 : Math.round(progressSum / total),
        learningTimeSeconds: learningTime._sum.learningTimeSeconds ?? 0,
        averageQuizScore: avgQuizScore,
        revenue: revenue.value,
        currencyLabel: revenue.currencyLabel,
      };
    }),
  );

  return rows;
}

export type CourseDetailKpis = {
  title: string;
  totalEnrollments: number;
  activeLearners: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  averageProgress: number;
  averageTimeToCompletionDays: number | null;
  totalLearningTimeSeconds: number;
  averageQuizScore: number | null;
  revenue: number;
  currencyLabel: string;
};

export async function getCourseDetailKpis(courseId: string, range: ResolvedRange): Promise<CourseDetailKpis | null> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  if (!course) return null;

  const [classified, learningTime, revenue, avgQuizScore, activeLearnerRows, enrollmentDates, completionEvents] =
    await Promise.all([
      classifyCourseEnrollments(courseId),
      prisma.userCourseLearningTime.aggregate({ where: { courseId }, _sum: { learningTimeSeconds: true } }),
      courseRevenue(courseId),
      courseAverageQuizScore(courseId),
      prisma.userCourseLearningTime.findMany({
        where: { courseId, lastActivityAt: { gte: range.from, lte: range.to } },
        select: { userId: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId, status: "ACTIVE" },
        select: { userId: true, enrolledAt: true },
      }),
      prisma.userActivityEvent.findMany({
        where: { type: "COURSE_COMPLETED", courseId },
        select: { userId: true, createdAt: true },
      }),
    ]);

  const enrolledAtByUser = new Map(enrollmentDates.map((e) => [e.userId, e.enrolledAt]));
  const durations: number[] = [];
  for (const ev of completionEvents) {
    const enrolledAt = enrolledAtByUser.get(ev.userId);
    if (enrolledAt) durations.push((ev.createdAt.getTime() - enrolledAt.getTime()) / 86400000);
  }

  const total = classified.size;
  let notStarted = 0;
  let inProgress = 0;
  let completed = 0;
  let progressSum = 0;
  for (const info of classified.values()) {
    progressSum += info.percent;
    if (info.completed) completed += 1;
    else if (info.started) inProgress += 1;
    else notStarted += 1;
  }

  const averageTimeToCompletionDays =
    durations.length === 0 ? null : Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10;

  return {
    title: course.title,
    totalEnrollments: total,
    activeLearners: new Set(activeLearnerRows.map((r) => r.userId)).size,
    notStarted,
    inProgress,
    completed,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
    averageProgress: total === 0 ? 0 : Math.round(progressSum / total),
    averageTimeToCompletionDays,
    totalLearningTimeSeconds: learningTime._sum.learningTimeSeconds ?? 0,
    averageQuizScore: avgQuizScore,
    revenue: revenue.value,
    currencyLabel: revenue.currencyLabel,
  };
}

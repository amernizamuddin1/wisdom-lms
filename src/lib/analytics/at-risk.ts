import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey, daysAgo, type ResolvedRange } from "./date-range";
import { getAllLearnerSegments } from "./learner-segments";
import { getAnalyticsSettings } from "./settings";
import { classifyCourseEnrollments } from "./funnel";

export type RiskReason =
  | "Enrolled but never started"
  | "Repeated quiz failures with no subsequent activity"
  | `Progress stalled after ${string}`
  | "Activity dropped significantly versus previous period"
  | `No learning activity for ${number} days`;

export type AtRiskRow = {
  userId: string;
  name: string;
  email: string;
  courses: string[]; // titles of currently-incomplete courses
  currentProgress: number; // avg % across incomplete courses
  lastMeaningfulActivityAt: Date | null;
  daysInactive: number | null;
  previousActivityLevel: "High" | "Some" | "Minimal";
  currentStreak: number;
  totalLearningTimeSeconds: number;
  riskReason: RiskReason;
};

async function buildAtRiskUserIds(): Promise<string[]> {
  const segments = await getAllLearnerSegments();
  return [...segments.entries()].filter(([, s]) => s === "AT_RISK").map(([id]) => id);
}

export async function getAtRiskLearnerRows(params: {
  search?: string;
  sort?: keyof AtRiskRow;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}): Promise<{ rows: AtRiskRow[]; total: number }> {
  const settings = await getAnalyticsSettings();
  const atRiskIds = await buildAtRiskUserIds();
  if (atRiskIds.length === 0) return { rows: [], total: 0 };

  const users = await prisma.user.findMany({
    where: {
      id: { in: atRiskIds },
      ...(params.search
        ? { OR: [{ name: { contains: params.search, mode: "insensitive" } }, { email: { contains: params.search, mode: "insensitive" } }] }
        : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return { rows: [], total: 0 };

  const atRiskWindowStartKey = dateKey(daysAgo(settings.atRiskDays - 1));
  const priorWindowStartKey = dateKey(daysAgo(settings.slowingDownDays * 2 - 1));

  const [profiles, lastActiveEvents, enrollments, priorActivity, quizAttempts, lessonProgressRows] = await Promise.all([
    prisma.userGamificationProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, currentStreak: true, totalLearningTimeSeconds: true },
    }),
    prisma.userActivityEvent.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _max: { createdAt: true } }),
    prisma.enrollment.findMany({
      where: { userId: { in: userIds }, status: "ACTIVE" },
      select: { userId: true, courseId: true, course: { select: { title: true } } },
    }),
    prisma.userDailyLearningActivity.findMany({
      where: { userId: { in: userIds }, activityDate: { gte: priorWindowStartKey, lt: atRiskWindowStartKey }, isQualifyingDay: true },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: { in: userIds } },
      orderBy: { attemptedAt: "desc" },
      select: { userId: true, passed: true, attemptedAt: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId: { in: userIds }, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { userId: true, completedAt: true, lesson: { select: { title: true } } },
    }),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
  const lastActiveByUser = new Map(lastActiveEvents.map((r) => [r.userId, r._max.createdAt]));
  const priorActiveSet = new Set(priorActivity.map((r) => r.userId));

  // Latest quiz-attempt pair per user (to detect "repeated failures, no follow-up").
  const attemptsByUser = new Map<string, { passed: boolean; attemptedAt: Date }[]>();
  for (const a of quizAttempts) {
    const arr = attemptsByUser.get(a.userId) ?? [];
    if (arr.length < 5) arr.push({ passed: a.passed, attemptedAt: a.attemptedAt });
    attemptsByUser.set(a.userId, arr);
  }

  const lastCompletedLessonByUser = new Map<string, { title: string; completedAt: Date }>();
  for (const lp of lessonProgressRows) {
    if (!lastCompletedLessonByUser.has(lp.userId) && lp.completedAt) {
      lastCompletedLessonByUser.set(lp.userId, { title: lp.lesson.title, completedAt: lp.completedAt });
    }
  }

  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
  const classifiedByCourse = new Map<string, Awaited<ReturnType<typeof classifyCourseEnrollments>>>();
  await Promise.all(
    courseIds.map(async (courseId) => {
      classifiedByCourse.set(courseId, await classifyCourseEnrollments(courseId));
    }),
  );

  const enrollmentsByUser = new Map<string, { courseId: string; title: string }[]>();
  for (const e of enrollments) {
    const arr = enrollmentsByUser.get(e.userId) ?? [];
    arr.push({ courseId: e.courseId, title: e.course.title });
    enrollmentsByUser.set(e.userId, arr);
  }

  const rows: AtRiskRow[] = users.map((user) => {
    const enrolls = enrollmentsByUser.get(user.id) ?? [];
    let hasNeverStarted = false;
    const incompleteTitles: string[] = [];
    const percents: number[] = [];

    for (const e of enrolls) {
      const info = classifiedByCourse.get(e.courseId)?.get(user.id);
      if (!info || info.completed) continue;
      incompleteTitles.push(e.title);
      percents.push(info.percent);
      if (!info.started) hasNeverStarted = true;
    }

    const currentProgress = percents.length === 0 ? 0 : Math.round(percents.reduce((s, v) => s + v, 0) / percents.length);
    const lastActive = lastActiveByUser.get(user.id) ?? null;
    const daysInactive = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 86400000) : null;

    const hadPriorActivity = priorActiveSet.has(user.id);
    const previousActivityLevel: AtRiskRow["previousActivityLevel"] = hadPriorActivity
      ? (profileByUser.get(user.id)?.currentStreak ?? 0) > 0
        ? "High"
        : "Some"
      : "Minimal";

    const recentAttempts = attemptsByUser.get(user.id) ?? [];
    const repeatedQuizFailures = recentAttempts.length >= 2 && recentAttempts.slice(0, 2).every((a) => !a.passed);
    const lastLesson = lastCompletedLessonByUser.get(user.id);

    let riskReason: RiskReason;
    if (hasNeverStarted && incompleteTitles.length > 0) {
      riskReason = "Enrolled but never started";
    } else if (repeatedQuizFailures) {
      riskReason = "Repeated quiz failures with no subsequent activity";
    } else if (lastLesson) {
      riskReason = `Progress stalled after ${lastLesson.title}`;
    } else if (hadPriorActivity) {
      riskReason = "Activity dropped significantly versus previous period";
    } else {
      riskReason = `No learning activity for ${settings.atRiskDays} days`;
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      courses: incompleteTitles,
      currentProgress,
      lastMeaningfulActivityAt: lastActive,
      daysInactive,
      previousActivityLevel,
      currentStreak: profileByUser.get(user.id)?.currentStreak ?? 0,
      totalLearningTimeSeconds: profileByUser.get(user.id)?.totalLearningTimeSeconds ?? 0,
      riskReason,
    };
  });

  const sort = params.sort ?? "daysInactive";
  const dir = params.sortDir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * dir;
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return 0;
  });

  const total = rows.length;
  const pageSize = params.pageSize ?? 25;
  const page = Math.max(1, params.page ?? 1);
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total };
}

export type AtRiskSummary = {
  total: number;
  newlyAtRisk: number;
  recovered: number;
  averageDaysInactive: number;
  topCourses: { courseId: string; title: string; atRiskCount: number }[];
};

export async function getAtRiskSummary(range: ResolvedRange): Promise<AtRiskSummary> {
  const { getSegmentTransitions } = await import("./segment-history");
  const [atRiskIds, transitions] = await Promise.all([buildAtRiskUserIds(), getSegmentTransitions(range)]);

  let averageDaysInactive = 0;
  const topCoursesMap = new Map<string, { title: string; count: number }>();

  if (atRiskIds.length > 0) {
    const [lastActiveEvents, enrollments] = await Promise.all([
      prisma.userActivityEvent.groupBy({ by: ["userId"], where: { userId: { in: atRiskIds } }, _max: { createdAt: true } }),
      prisma.enrollment.findMany({
        where: { userId: { in: atRiskIds }, status: "ACTIVE" },
        select: { courseId: true, course: { select: { title: true } } },
      }),
    ]);
    const daysInactiveValues = lastActiveEvents
      .map((r) => (r._max.createdAt ? Math.floor((Date.now() - r._max.createdAt.getTime()) / 86400000) : null))
      .filter((v): v is number => v !== null);
    averageDaysInactive =
      daysInactiveValues.length === 0 ? 0 : Math.round(daysInactiveValues.reduce((s, v) => s + v, 0) / daysInactiveValues.length);

    for (const e of enrollments) {
      const entry = topCoursesMap.get(e.courseId) ?? { title: e.course.title, count: 0 };
      entry.count += 1;
      topCoursesMap.set(e.courseId, entry);
    }
  }

  const topCourses = [...topCoursesMap.entries()]
    .map(([courseId, v]) => ({ courseId, title: v.title, atRiskCount: v.count }))
    .sort((a, b) => b.atRiskCount - a.atRiskCount)
    .slice(0, 5);

  return {
    total: atRiskIds.length,
    newlyAtRisk: transitions.insufficientData ? 0 : transitions.newlyAtRisk,
    recovered: transitions.insufficientData ? 0 : transitions.recovered,
    averageDaysInactive,
    topCourses,
  };
}

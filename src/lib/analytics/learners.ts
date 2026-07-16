import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import type { ResolvedRange } from "./date-range";
import { getAllLearnerSegments, type EngagementSegment } from "./learner-segments";
import { classifyCourseEnrollments, getFunnelStageLearnerIds } from "./funnel";
import type { FunnelStage } from "./definitions";
import { ANALYTICS_ROW_CAP } from "./shared";
import { countTenantStudents, getTenantStudentMemberships } from "./tenant-learners";

export const MAX_LEARNER_ROWS = 5000;

export type LearnerRow = {
  userId: string;
  name: string;
  email: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  overallProgress: number;
  totalLearningTimeSeconds: number;
  averageQuizScore: number | null;
  lastActiveAt: Date | null;
  segment: EngagementSegment;
  currentStreak: number;
  xp: number;
};

// Pushes the name/email search down to the initial User query — rather than
// fetching up to MAX_LEARNER_ROWS students unconditionally and filtering in
// JS — so every downstream aggregate query below is scoped to just the
// matched learners instead of the whole platform. Deterministic `orderBy` so
// the row cap truncates predictably instead of an arbitrary DB-decided order.
async function buildLearnerRows(search?: string): Promise<LearnerRow[]> {
  const tenantStudentIds = (await getTenantStudentMemberships()).map((m) => m.userId);
  const users = await prisma.user.findMany({
    where: {
      id: { in: tenantStudentIds },
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] }
        : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: MAX_LEARNER_ROWS,
  });
  const userIds = users.map((u) => u.id);

  const [profiles, enrollCounts, completedCounts, lastActiveRows, segments, quizAttempts] = await Promise.all([
    prisma.userGamificationProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, currentStreak: true, totalXp: true, totalLearningTimeSeconds: true },
    }),
    prisma.enrollment.groupBy({ by: ["userId"], where: { status: "ACTIVE", userId: { in: userIds } }, _count: { _all: true } }),
    prisma.userActivityEvent.groupBy({
      by: ["userId"],
      where: { type: "COURSE_COMPLETED", userId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.userActivityEvent.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _max: { createdAt: true } }),
    // Segment classification looks at every learner regardless of this search
    // (the engagement distribution chart needs the platform-wide picture) —
    // not scoped to userIds, but already batched via groupBy internally.
    getAllLearnerSegments(),
    prisma.quizAttempt.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, quizId: true, score: true },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
  const enrollByUser = new Map(enrollCounts.map((e) => [e.userId, e._count._all]));
  const completedByUser = new Map(completedCounts.map((e) => [e.userId, e._count._all]));
  const lastActiveByUser = new Map(lastActiveRows.map((r) => [r.userId, r._max.createdAt]));

  const bestByUserQuiz = new Map<string, number>();
  for (const a of quizAttempts) {
    const key = `${a.userId}:${a.quizId}`;
    bestByUserQuiz.set(key, Math.max(bestByUserQuiz.get(key) ?? 0, a.score));
  }
  const quizScoresByUser = new Map<string, number[]>();
  for (const [key, score] of bestByUserQuiz) {
    const userId = key.split(":")[0];
    const arr = quizScoresByUser.get(userId) ?? [];
    arr.push(score);
    quizScoresByUser.set(userId, arr);
  }

  return users.map((user) => {
    const enrolled = enrollByUser.get(user.id) ?? 0;
    const completed = completedByUser.get(user.id) ?? 0;
    const scores = quizScoresByUser.get(user.id);
    const profile = profileByUser.get(user.id);
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      coursesEnrolled: enrolled,
      coursesCompleted: completed,
      // Coarse-but-honest progress figure: share of enrolled courses fully
      // completed. A lesson/quiz-weighted average across every learner's
      // every course is too expensive to compute on every table render at
      // scale — see courses.ts's per-course averageProgress for that detail.
      overallProgress: enrolled === 0 ? 0 : Math.round((completed / enrolled) * 100),
      totalLearningTimeSeconds: profile?.totalLearningTimeSeconds ?? 0,
      averageQuizScore: scores && scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null,
      lastActiveAt: lastActiveByUser.get(user.id) ?? null,
      segment: segments.get(user.id) ?? "DORMANT",
      currentStreak: profile?.currentStreak ?? 0,
      xp: profile?.totalXp ?? 0,
    };
  });
}

export type LearnerTableParams = {
  search?: string;
  sort?: keyof LearnerRow;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  segment?: EngagementSegment;
  courseId?: string;
  courseStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  funnelStage?: FunnelStage;
};

export async function getLearnerTable(params: LearnerTableParams): Promise<{ rows: LearnerRow[]; total: number }> {
  let rows = await buildLearnerRows(params.search);

  if (params.segment) rows = rows.filter((r) => r.segment === params.segment);

  if (params.funnelStage) {
    const allowed = await getFunnelStageLearnerIds(params.courseId ?? null, params.funnelStage);
    rows = rows.filter((r) => allowed.has(r.userId));
  } else if (params.courseId && params.courseStatus) {
    const classified = await classifyCourseEnrollments(params.courseId);
    rows = rows.filter((r) => {
      const info = classified.get(r.userId);
      if (!info) return false;
      const status = info.completed ? "COMPLETED" : info.started ? "IN_PROGRESS" : "NOT_STARTED";
      return status === params.courseStatus;
    });
  } else if (params.courseId) {
    const classified = await classifyCourseEnrollments(params.courseId);
    rows = rows.filter((r) => classified.has(r.userId));
  }

  const sort = params.sort ?? "name";
  const dir = params.sortDir === "desc" ? -1 : 1;
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

export type LearnerKpis = {
  totalLearners: number;
  newLearners: number;
  activeLearners: number;
  returningLearners: number;
  inactiveLearners: number;
  atRiskLearners: number;
  averageLearningTimeSeconds: number;
  averageCoursesPerLearner: number;
};

export async function getLearnerKpis(range: ResolvedRange): Promise<LearnerKpis> {
  const fromKey = range.from.toISOString().slice(0, 10);
  const toKey = range.to.toISOString().slice(0, 10);

  const [totalLearners, newLearners, activityInRange, activityBeforeRange, totalEnrollments, totalLearningAgg, segments] =
    await Promise.all([
      countTenantStudents(),
      countTenantStudents({ createdAt: { gte: range.from, lte: range.to } }),
      prisma.userDailyLearningActivity.findMany({
        where: { activityDate: { gte: fromKey, lte: toKey }, isQualifyingDay: true },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.userDailyLearningActivity.findMany({
        where: { activityDate: { lt: fromKey }, isQualifyingDay: true },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.userDailyLearningActivity.aggregate({
        where: { activityDate: { gte: fromKey, lte: toKey } },
        _sum: { learningTimeSeconds: true },
      }),
      getAllLearnerSegments(),
    ]);

  const activeSet = new Set(activityInRange.map((r) => r.userId));
  const beforeSet = new Set(activityBeforeRange.map((r) => r.userId));
  let returningLearners = 0;
  for (const userId of activeSet) if (beforeSet.has(userId)) returningLearners += 1;

  const atRiskLearners = [...segments.values()].filter((s) => s === "AT_RISK").length;

  return {
    totalLearners,
    newLearners,
    activeLearners: activeSet.size,
    returningLearners,
    inactiveLearners: Math.max(0, totalLearners - activeSet.size),
    atRiskLearners,
    averageLearningTimeSeconds: totalLearners === 0 ? 0 : Math.round((totalLearningAgg._sum.learningTimeSeconds ?? 0) / totalLearners),
    averageCoursesPerLearner: totalLearners === 0 ? 0 : Math.round((totalEnrollments / totalLearners) * 10) / 10,
  };
}

export type LearnerCourseRow = {
  courseId: string;
  courseTitle: string;
  enrolledAt: Date;
  progress: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  timeSpentSeconds: number;
  quizScore: number | null;
  completedAt: Date | null;
  accessEndAt: Date | null;
};

export type LearnerProfile = {
  userId: string;
  name: string;
  email: string;
  joinedAt: Date;
  lastActiveAt: Date | null;
  coursesEnrolled: number;
  coursesCompleted: number;
  overallProgress: number;
  totalLearningTimeSeconds: number;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  levelName: string | null;
  achievementsUnlocked: number;
  averageQuizScore: number | null;
  segment: EngagementSegment;
  courses: LearnerCourseRow[];
};

export async function getLearnerProfile(userId: string): Promise<LearnerProfile | null> {
  const { getLevelProgress } = await import("@/lib/gamification/levels");
  const { classifyCourseEnrollments } = await import("./funnel");

  // Verify userId is actually a member of the active tenant before returning
  // anything — this is a route param an admin could set to any UUID, so
  // without this check a tenant A admin could view tenant B's learner PII.
  const tenantId = await getTenantId();
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true } });
  if (!user) return null;

  const [profile, enrollments, lastActiveEvent, achievementCount, segments] = await Promise.all([
    prisma.userGamificationProfile.findUnique({ where: { userId } }),
    prisma.enrollment.findMany({
      where: { userId, status: "ACTIVE" },
      include: { course: { select: { id: true, title: true } } },
    }),
    prisma.userActivityEvent.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.userAchievement.count({ where: { userId } }),
    getAllLearnerSegments(),
  ]);

  const levelProgress = await getLevelProgress(prisma, profile?.totalXp ?? 0);

  const courses: LearnerCourseRow[] = [];
  let progressSum = 0;
  let completedCount = 0;
  const allQuizScores: number[] = [];

  for (const enrollment of enrollments) {
    const [classified, learningTime, attempts, completionEvent, certificate] = await Promise.all([
      classifyCourseEnrollments(enrollment.courseId),
      prisma.userCourseLearningTime.findUnique({
        where: { userId_courseId: { userId, courseId: enrollment.courseId } },
      }),
      prisma.quizAttempt.findMany({
        where: { userId, OR: [{ quiz: { courseId: enrollment.courseId } }, { quiz: { chapter: { courseId: enrollment.courseId } } }] },
        select: { quizId: true, score: true },
      }),
      prisma.userActivityEvent.findFirst({
        where: { userId, courseId: enrollment.courseId, type: "COURSE_COMPLETED" },
        select: { createdAt: true },
      }),
      prisma.certificate.findFirst({ where: { userId, courseId: enrollment.courseId }, select: { issuedAt: true } }),
    ]);

    const info = classified.get(userId) ?? { started: false, percent: 0, completed: false };
    progressSum += info.percent;
    if (info.completed) completedCount += 1;

    const bestByQuiz = new Map<string, number>();
    for (const a of attempts) bestByQuiz.set(a.quizId, Math.max(bestByQuiz.get(a.quizId) ?? 0, a.score));
    const quizValues = [...bestByQuiz.values()];
    const courseQuizAvg = quizValues.length > 0 ? Math.round(quizValues.reduce((s, v) => s + v, 0) / quizValues.length) : null;
    if (courseQuizAvg !== null) allQuizScores.push(courseQuizAvg);

    courses.push({
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.title,
      enrolledAt: enrollment.enrolledAt,
      progress: info.percent,
      status: info.completed ? "COMPLETED" : info.started ? "IN_PROGRESS" : "NOT_STARTED",
      timeSpentSeconds: learningTime?.learningTimeSeconds ?? 0,
      quizScore: courseQuizAvg,
      completedAt: completionEvent?.createdAt ?? certificate?.issuedAt ?? null,
      accessEndAt: enrollment.isPermanent ? null : enrollment.accessEndAt,
    });
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    joinedAt: user.createdAt,
    lastActiveAt: lastActiveEvent?.createdAt ?? null,
    coursesEnrolled: enrollments.length,
    coursesCompleted: completedCount,
    overallProgress: enrollments.length === 0 ? 0 : Math.round(progressSum / enrollments.length),
    totalLearningTimeSeconds: profile?.totalLearningTimeSeconds ?? 0,
    currentStreak: profile?.currentStreak ?? 0,
    longestStreak: profile?.longestStreak ?? 0,
    xp: profile?.totalXp ?? 0,
    levelName: levelProgress?.currentLevel?.name ?? null,
    achievementsUnlocked: achievementCount,
    averageQuizScore: allQuizScores.length > 0 ? Math.round(allQuizScores.reduce((s, v) => s + v, 0) / allQuizScores.length) : null,
    segment: segments.get(userId) ?? "DORMANT",
    courses,
  };
}

export type TimelineEvent = {
  id: string;
  type: string;
  label: string;
  createdAt: Date;
  xpAwarded: number;
};

const EVENT_LABELS: Record<string, string> = {
  USER_REGISTERED: "Joined the platform",
  PROFILE_COMPLETED: "Completed profile",
  COURSE_ENROLLED: "Enrolled in a course",
  LESSON_STARTED: "Started a lesson",
  LESSON_COMPLETED: "Completed a lesson",
  MODULE_COMPLETED: "Completed a module",
  COURSE_COMPLETED: "Completed a course",
  VIDEO_WATCH_PROGRESS: "Watched video content",
  QUIZ_STARTED: "Started a quiz",
  QUIZ_COMPLETED: "Attempted a quiz",
  QUIZ_PASSED: "Passed a quiz",
  QUIZ_HIGH_SCORE: "Scored 90%+ on a quiz",
  QUIZ_PERFECT_SCORE: "Scored 100% on a quiz",
  CERTIFICATE_EARNED: "Earned a certificate",
  DAILY_LEARNING_GOAL_COMPLETED: "Completed daily learning goal",
  STREAK_MILESTONE_REACHED: "Reached a streak milestone",
  BADGE_EARNED: "Earned a badge",
  LEVEL_REACHED: "Reached a new level",
  DISCUSSION_POST_CREATED: "Posted in the community",
  DISCUSSION_REPLY_CREATED: "Replied in the community",
};

export async function getLearnerTimeline(userId: string, take = 100): Promise<TimelineEvent[]> {
  const events = await prisma.userActivityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, createdAt: true, xpAwarded: true },
  });
  return events.map((e) => ({ id: e.id, type: e.type, label: EVENT_LABELS[e.type] ?? e.type, createdAt: e.createdAt, xpAwarded: e.xpAwarded }));
}

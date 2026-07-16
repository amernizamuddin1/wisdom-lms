import "server-only";
import { prisma } from "@/lib/prisma";
import { getLevelProgress, type LevelProgress } from "./levels";

export type AnalyticsSnapshot = {
  coursesEnrolled: number;
  coursesCompleted: number;
  modulesCompleted: number;
  lessonsCompleted: number;
  totalLearningTimeSeconds: number;
  totalVideoWatchTimeSeconds: number;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  totalXp: number;
  levelProgress: LevelProgress | null;
  quizzesAttempted: number;
  quizzesPassed: number;
  quizPassRate: number | null;
  averageQuizScore: number | null;
  perfectQuizScores: number;
  certificatesEarned: number;
  discussionPostsCreated: number;
  discussionRepliesCreated: number;
  helpfulReactionsReceived: number;
  acceptedOrHelpfulAnswers: number;
};

// Quiz pass rate = distinct quizzes ever passed / distinct quizzes attempted
// (matches the app's existing "ever passed" convention, not attempt-based).
// Average quiz score = average of each quiz's *best* score across attempts
// (fairest — an early low attempt doesn't permanently drag the average once
// the learner masters it). Both documented in the implementation plan.
async function getQuizStats(userId: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    select: { quizId: true, score: true, passed: true },
  });

  const bestByQuiz = new Map<string, { best: number; everPassed: boolean }>();
  for (const a of attempts) {
    const existing = bestByQuiz.get(a.quizId);
    if (!existing) {
      bestByQuiz.set(a.quizId, { best: a.score, everPassed: a.passed });
    } else {
      existing.best = Math.max(existing.best, a.score);
      existing.everPassed = existing.everPassed || a.passed;
    }
  }

  const quizzesAttempted = bestByQuiz.size;
  const quizzesPassed = [...bestByQuiz.values()].filter((q) => q.everPassed).length;
  const perfectQuizScores = [...bestByQuiz.values()].filter((q) => q.best === 100).length;
  const averageQuizScore =
    quizzesAttempted === 0
      ? null
      : Math.round([...bestByQuiz.values()].reduce((sum, q) => sum + q.best, 0) / quizzesAttempted);
  const quizPassRate = quizzesAttempted === 0 ? null : Math.round((quizzesPassed / quizzesAttempted) * 100);

  return { quizzesAttempted, quizzesPassed, quizPassRate, averageQuizScore, perfectQuizScores };
}

// Discussion-related activity events, recorded by lib/community/{threads,answers,replies,reactions}.ts
// via lib/gamification/events.ts. DISCUSSION_ANSWER_MARKED_HELPFUL is included for
// forward-compatibility but never actually fires today (see events.ts — no dedicated
// "mark helpful" UI control exists yet, only the generic reaction and accept-answer flows).
async function getDiscussionStats(userId: string) {
  const [postsCreated, repliesCreated, reactionsReceived, acceptedOrHelpfulAnswers] = await Promise.all([
    prisma.userActivityEvent.count({ where: { userId, type: "DISCUSSION_POST_CREATED" } }),
    prisma.userActivityEvent.count({ where: { userId, type: "DISCUSSION_REPLY_CREATED" } }),
    prisma.userActivityEvent.count({ where: { userId, type: "DISCUSSION_REACTION_RECEIVED" } }),
    prisma.userActivityEvent.count({
      where: { userId, type: { in: ["DISCUSSION_ANSWER_ACCEPTED", "DISCUSSION_ANSWER_MARKED_HELPFUL"] } },
    }),
  ]);
  return {
    discussionPostsCreated: postsCreated,
    discussionRepliesCreated: repliesCreated,
    helpfulReactionsReceived: reactionsReceived,
    acceptedOrHelpfulAnswers,
  };
}

export async function getAnalyticsSnapshot(userId: string): Promise<AnalyticsSnapshot> {
  const [
    coursesEnrolled,
    coursesCompleted,
    modulesCompleted,
    lessonsCompleted,
    profile,
    quizStats,
    certificatesEarned,
    discussionStats,
  ] = await Promise.all([
    prisma.enrollment.count({ where: { userId, status: "ACTIVE" } }),
    prisma.userActivityEvent.count({ where: { userId, type: "COURSE_COMPLETED" } }),
    prisma.userActivityEvent.count({ where: { userId, type: "MODULE_COMPLETED" } }),
    prisma.lessonProgress.count({ where: { userId, completedAt: { not: null } } }),
    prisma.userGamificationProfile.findUnique({ where: { userId } }),
    getQuizStats(userId),
    prisma.certificate.count({ where: { userId } }),
    getDiscussionStats(userId),
  ]);

  const totalXp = profile?.totalXp ?? 0;
  const levelProgress = await getLevelProgress(prisma, totalXp);

  return {
    coursesEnrolled,
    coursesCompleted,
    modulesCompleted,
    lessonsCompleted,
    totalLearningTimeSeconds: profile?.totalLearningTimeSeconds ?? 0,
    totalVideoWatchTimeSeconds: profile?.totalVideoWatchTimeSeconds ?? 0,
    currentStreak: profile?.currentStreak ?? 0,
    longestStreak: profile?.longestStreak ?? 0,
    totalActiveDays: profile?.totalActiveDays ?? 0,
    totalXp,
    levelProgress,
    ...quizStats,
    certificatesEarned,
    ...discussionStats,
  };
}

export type DailyActivityPoint = {
  date: string;
  learningMinutes: number;
  lessonsCompleted: number;
  xpEarned: number;
};

export async function getDailyActivity(userId: string, sinceDate: string | null): Promise<DailyActivityPoint[]> {
  const rows = await prisma.userDailyLearningActivity.findMany({
    where: { userId, ...(sinceDate ? { activityDate: { gte: sinceDate } } : {}) },
    orderBy: { activityDate: "asc" },
  });
  return rows.map((r) => ({
    date: r.activityDate,
    learningMinutes: Math.round(r.learningTimeSeconds / 60),
    lessonsCompleted: r.lessonsCompleted,
    xpEarned: r.xpEarned,
  }));
}

export type HeatmapDay = { date: string; level: 0 | 1 | 2 | 3 | 4 };

// GitHub-style 0-4 intensity bucketing by minutes learned that day.
function bucketMinutes(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

export async function getHeatmapData(userId: string, sinceDate: string): Promise<HeatmapDay[]> {
  const rows = await prisma.userDailyLearningActivity.findMany({
    where: { userId, activityDate: { gte: sinceDate } },
    select: { activityDate: true, learningTimeSeconds: true },
  });
  return rows.map((r) => ({
    date: r.activityDate,
    level: bucketMinutes(Math.round(r.learningTimeSeconds / 60)),
  }));
}

export type CourseProgressRow = {
  courseId: string;
  title: string;
  percentComplete: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  modulesCompleted: number;
  modulesTotal: number;
  learningTimeSeconds: number;
  quizAverage: number | null;
  lastActivityAt: Date | null;
};

export async function getCourseProgress(userId: string): Promise<CourseProgressRow[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      course: {
        include: {
          chapters: { include: { lessons: true, quizzes: true } },
          quizzes: { where: { chapterId: null } },
        },
      },
    },
  });

  const results: CourseProgressRow[] = [];

  for (const enrollment of enrollments) {
    const course = enrollment.course;
    const allLessonIds = course.chapters.flatMap((c) => c.lessons.map((l) => l.id));
    const allQuizIds = [
      ...course.quizzes.map((q) => q.id),
      ...course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
    ];

    const [completedLessons, attempts, learningTime, lastEvent, moduleEventsCount] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: allLessonIds }, completedAt: { not: null } },
        select: { lessonId: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: allQuizIds } },
        select: { quizId: true, score: true, passed: true },
      }),
      prisma.userCourseLearningTime.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
      }),
      prisma.userActivityEvent.findFirst({
        where: { userId, courseId: course.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.userActivityEvent.count({ where: { userId, courseId: course.id, type: "MODULE_COMPLETED" } }),
    ]);

    const completedLessonIds = new Set(completedLessons.map((l) => l.lessonId));
    const bestByQuiz = new Map<string, number>();
    const passedQuizIds = new Set<string>();
    for (const a of attempts) {
      bestByQuiz.set(a.quizId, Math.max(bestByQuiz.get(a.quizId) ?? 0, a.score));
      if (a.passed) passedQuizIds.add(a.quizId);
    }

    const totalItems = allLessonIds.length + allQuizIds.length;
    const completedItems = completedLessonIds.size + passedQuizIds.size;
    const percentComplete = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

    const quizAverage =
      bestByQuiz.size === 0
        ? null
        : Math.round([...bestByQuiz.values()].reduce((sum, s) => sum + s, 0) / bestByQuiz.size);

    results.push({
      courseId: course.id,
      title: course.title,
      percentComplete,
      lessonsCompleted: completedLessonIds.size,
      lessonsTotal: allLessonIds.length,
      modulesCompleted: moduleEventsCount,
      modulesTotal: course.chapters.length,
      learningTimeSeconds: learningTime?.learningTimeSeconds ?? 0,
      quizAverage,
      lastActivityAt: lastEvent?.createdAt ?? null,
    });
  }

  return results;
}

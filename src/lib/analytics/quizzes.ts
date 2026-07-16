import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ResolvedRange } from "./date-range";
import { ANALYTICS_ROW_CAP } from "./shared";

export type QuizFilters = { range: ResolvedRange; courseId: string | null; quizId: string | null };

function attemptsWhere(filters: QuizFilters): Prisma.QuizAttemptWhereInput {
  const where: Prisma.QuizAttemptWhereInput = { attemptedAt: { gte: filters.range.from, lte: filters.range.to } };
  if (filters.quizId) {
    where.quizId = filters.quizId;
  } else if (filters.courseId) {
    where.OR = [{ quiz: { courseId: filters.courseId } }, { quiz: { chapter: { courseId: filters.courseId } } }];
  }
  return where;
}

type RawAttempt = { userId: string; quizId: string; score: number; passed: boolean; attemptedAt: Date };

async function fetchAttempts(filters: QuizFilters): Promise<RawAttempt[]> {
  return prisma.quizAttempt.findMany({
    where: attemptsWhere(filters),
    select: { userId: true, quizId: true, score: true, passed: true, attemptedAt: true },
    orderBy: { attemptedAt: "asc" },
    take: ANALYTICS_ROW_CAP,
  });
}

// Average of each learner's *best* score per quiz — the same convention used
// everywhere else in the analytics system (overview.ts, courses.ts, learners.ts)
// so "Average Quiz Score" means one consistent thing across every page. A raw
// mean over every individual attempt (including repeat fails before a learner
// masters it) would silently disagree with those other pages for the same data.
function bestScoreAverage(attempts: RawAttempt[]): number | null {
  if (attempts.length === 0) return null;
  const bestByUserQuiz = new Map<string, number>();
  for (const a of attempts) {
    const key = `${a.userId}:${a.quizId}`;
    bestByUserQuiz.set(key, Math.max(bestByUserQuiz.get(key) ?? 0, a.score));
  }
  const values = [...bestByUserQuiz.values()];
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function averageAttemptsToPass(attempts: RawAttempt[]): number | null {
  const byPair = new Map<string, RawAttempt[]>();
  for (const a of attempts) {
    const key = `${a.userId}:${a.quizId}`;
    const arr = byPair.get(key) ?? [];
    arr.push(a);
    byPair.set(key, arr);
  }
  const attemptsToPass: number[] = [];
  for (const arr of byPair.values()) {
    const firstPassIndex = arr.findIndex((a) => a.passed);
    if (firstPassIndex >= 0) attemptsToPass.push(firstPassIndex + 1);
  }
  if (attemptsToPass.length === 0) return null;
  return Math.round((attemptsToPass.reduce((s, v) => s + v, 0) / attemptsToPass.length) * 10) / 10;
}

export type QuizKpis = {
  totalAttempts: number;
  uniqueLearners: number;
  averageScore: number | null;
  passRate: number;
  failureRate: number;
  perfectScores: number;
  averageAttemptsToPass: number | null;
};

export async function getQuizKpis(filters: QuizFilters): Promise<QuizKpis> {
  const attempts = await fetchAttempts(filters);
  const totalAttempts = attempts.length;
  const uniqueLearners = new Set(attempts.map((a) => a.userId)).size;
  const passedCount = attempts.filter((a) => a.passed).length;
  const perfectScores = attempts.filter((a) => a.score === 100).length;
  const averageScore = bestScoreAverage(attempts);
  const passRate = totalAttempts === 0 ? 0 : Math.round((passedCount / totalAttempts) * 1000) / 10;

  return {
    totalAttempts,
    uniqueLearners,
    averageScore,
    passRate,
    failureRate: totalAttempts === 0 ? 0 : Math.round((100 - passRate) * 10) / 10,
    perfectScores,
    averageAttemptsToPass: averageAttemptsToPass(attempts),
  };
}

export const SCORE_BUCKETS = ["0-20", "21-40", "41-60", "61-80", "81-100"] as const;

export async function getScoreDistribution(filters: QuizFilters): Promise<{ bucket: string; count: number }[]> {
  const attempts = await fetchAttempts(filters);
  const counts: Record<string, number> = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  for (const a of attempts) {
    if (a.score <= 20) counts["0-20"] += 1;
    else if (a.score <= 40) counts["21-40"] += 1;
    else if (a.score <= 60) counts["41-60"] += 1;
    else if (a.score <= 80) counts["61-80"] += 1;
    else counts["81-100"] += 1;
  }
  return SCORE_BUCKETS.map((bucket) => ({ bucket, count: counts[bucket] }));
}

export type QuizPerformanceRow = {
  quizId: string;
  quizTitle: string;
  courseTitle: string;
  attempts: number;
  uniqueLearners: number;
  averageScore: number | null;
  passRate: number;
  failureRate: number;
  averageAttemptsToPass: number | null;
};

export async function getQuizPerformanceRows(filters: QuizFilters): Promise<QuizPerformanceRow[]> {
  const attempts = await fetchAttempts(filters);
  const quizIds = filters.quizId ? [filters.quizId] : [...new Set(attempts.map((a) => a.quizId))];

  const quizzes = await prisma.quiz.findMany({
    where: { id: { in: quizIds } },
    select: { id: true, title: true, course: { select: { title: true } }, chapter: { select: { course: { select: { title: true } } } } },
  });

  const byQuiz = new Map<string, RawAttempt[]>();
  for (const a of attempts) {
    const arr = byQuiz.get(a.quizId) ?? [];
    arr.push(a);
    byQuiz.set(a.quizId, arr);
  }

  return quizzes.map((quiz) => {
    const quizAttempts = byQuiz.get(quiz.id) ?? [];
    const total = quizAttempts.length;
    const passed = quizAttempts.filter((a) => a.passed).length;
    const passRate = total === 0 ? 0 : Math.round((passed / total) * 1000) / 10;
    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      courseTitle: quiz.course?.title ?? quiz.chapter?.course.title ?? "—",
      attempts: total,
      uniqueLearners: new Set(quizAttempts.map((a) => a.userId)).size,
      averageScore: bestScoreAverage(quizAttempts),
      passRate,
      failureRate: total === 0 ? 0 : Math.round((100 - passRate) * 10) / 10,
      averageAttemptsToPass: averageAttemptsToPass(quizAttempts),
    };
  });
}

import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { MIN_COMPARISON_SAMPLE_SIZE } from "./definitions";
import { getReturningLearnerCount } from "./engagement";
import { getMeaningfulActivityDateKeys } from "./shared";

export type ComparisonMetric = { label: string; withGroupValue: number; withoutGroupValue: number; unit: "percent" | "minutes" | "days" | "score" };

export type ComparisonResult =
  | { suppressed: true; withGroupSize: number; withoutGroupSize: number; minSampleSize: number }
  | { suppressed: false; withGroupSize: number; withoutGroupSize: number; metrics: ComparisonMetric[] };

// Observational only — never implies causation (see spec §14). Both groups
// must clear MIN_COMPARISON_SAMPLE_SIZE or the comparison is suppressed
// rather than shown with a misleadingly precise percentage on a tiny group.
export async function getStreakEngagementComparison(range: ResolvedRange): Promise<ComparisonResult> {
  const profiles = await prisma.userGamificationProfile.findMany({ select: { userId: true, currentStreak: true } });
  const withGroup = profiles.filter((p) => p.currentStreak >= 1).map((p) => p.userId);
  const withoutGroup = profiles.filter((p) => p.currentStreak === 0).map((p) => p.userId);

  if (withGroup.length < MIN_COMPARISON_SAMPLE_SIZE || withoutGroup.length < MIN_COMPARISON_SAMPLE_SIZE) {
    return { suppressed: true, withGroupSize: withGroup.length, withoutGroupSize: withoutGroup.length, minSampleSize: MIN_COMPARISON_SAMPLE_SIZE };
  }

  const [withStats, withoutStats] = await Promise.all([groupStats(withGroup, range), groupStats(withoutGroup, range)]);

  return {
    suppressed: false,
    withGroupSize: withGroup.length,
    withoutGroupSize: withoutGroup.length,
    metrics: [
      { label: "Completion rate", withGroupValue: withStats.completionRate, withoutGroupValue: withoutStats.completionRate, unit: "percent" },
      { label: "Avg. learning time", withGroupValue: withStats.avgLearningMinutes, withoutGroupValue: withoutStats.avgLearningMinutes, unit: "minutes" },
      { label: "Avg. active days", withGroupValue: withStats.avgActiveDays, withoutGroupValue: withoutStats.avgActiveDays, unit: "days" },
      { label: "Avg. quiz score", withGroupValue: withStats.avgQuizScore, withoutGroupValue: withoutStats.avgQuizScore, unit: "score" },
      { label: "Returning learner rate", withGroupValue: withStats.returningRate, withoutGroupValue: withoutStats.returningRate, unit: "percent" },
    ],
  };
}

async function groupStats(userIds: string[], range: ResolvedRange) {
  const [enrollments, completions, learningAgg, quizAttempts, activityMap] = await Promise.all([
    prisma.enrollment.count({ where: { userId: { in: userIds }, status: "ACTIVE" } }),
    prisma.userActivityEvent.findMany({
      where: { userId: { in: userIds }, type: "COURSE_COMPLETED" },
      distinct: ["userId", "courseId"],
      select: { userId: true },
    }),
    prisma.userDailyLearningActivity.aggregate({
      where: { userId: { in: userIds }, activityDate: { gte: range.from.toISOString().slice(0, 10), lte: range.to.toISOString().slice(0, 10) } },
      _sum: { learningTimeSeconds: true },
    }),
    prisma.quizAttempt.findMany({ where: { userId: { in: userIds } }, select: { userId: true, quizId: true, score: true } }),
    getMeaningfulActivityDateKeys(range.from, range.to),
  ]);

  const activeInRange = userIds.filter((id) => activityMap.has(id));
  const returningCount = await getReturningLearnerCount(activeInRange, range.from);

  const bestByUserQuiz = new Map<string, number>();
  for (const a of quizAttempts) {
    const key = `${a.userId}:${a.quizId}`;
    bestByUserQuiz.set(key, Math.max(bestByUserQuiz.get(key) ?? 0, a.score));
  }
  const quizValues = [...bestByUserQuiz.values()];

  const totalActiveDays = activeInRange.reduce((sum, id) => sum + (activityMap.get(id)?.size ?? 0), 0);

  return {
    completionRate: enrollments === 0 ? 0 : Math.round((completions.length / enrollments) * 1000) / 10,
    avgLearningMinutes: userIds.length === 0 ? 0 : Math.round((learningAgg._sum.learningTimeSeconds ?? 0) / 60 / userIds.length),
    avgActiveDays: activeInRange.length === 0 ? 0 : Math.round((totalActiveDays / activeInRange.length) * 10) / 10,
    avgQuizScore: quizValues.length === 0 ? 0 : Math.round(quizValues.reduce((s, v) => s + v, 0) / quizValues.length),
    returningRate: activeInRange.length === 0 ? 0 : Math.round((returningCount / activeInRange.length) * 1000) / 10,
  };
}

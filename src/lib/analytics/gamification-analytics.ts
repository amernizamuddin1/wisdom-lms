import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey, type ResolvedRange } from "./date-range";
import { downsample, ANALYTICS_ROW_CAP } from "./shared";
import { XP_CATEGORIES } from "./definitions";
import { countTenantStudents } from "./tenant-learners";

// Deterministic ruleCode -> category mapping, built from the exact set of
// rule codes actually used by lib/gamification (see awardXp() call sites) —
// never invented. Anything not in this list (including a null ruleCode, e.g.
// admin manual awards) falls into "Other".
const XP_CATEGORY_MAP: Record<string, string> = {
  LESSON_COMPLETED: "Learning Progress",
  PROFILE_COMPLETED: "Learning Progress",
  MODULE_COMPLETED: "Learning Progress",
  COURSE_COMPLETED: "Learning Progress",
  CERTIFICATE_EARNED: "Learning Progress",
  QUIZ_PASSED: "Quizzes",
  QUIZ_HIGH_SCORE: "Quizzes",
  QUIZ_PERFECT_SCORE: "Quizzes",
  DISCUSSION_FIRST_POST: "Community",
  DISCUSSION_POST: "Community",
  DISCUSSION_REPLY: "Community",
  DISCUSSION_HELPFUL_REACTION_RECEIVED: "Community",
  DISCUSSION_ANSWER_ACCEPTED: "Community",
  DISCUSSION_ANSWER_HELPFUL: "Community",
  BADGE_EARNED: "Achievements",
};

export function categoryFor(ruleCode: string | null): string {
  return (ruleCode && XP_CATEGORY_MAP[ruleCode]) || "Other";
}

export type GamificationKpis = {
  totalXpAwarded: number;
  learnersWhoEarnedXp: number;
  achievementsUnlocked: number;
  activeStreaks: number;
  averageCurrentStreak: number;
  longestCurrentStreak: number;
  averageLearnerLevelOrder: number | null;
  averageLearnerLevelName: string | null;
  learnersWithNoGamificationActivity: number;
};

export async function getGamificationKpis(range: ResolvedRange): Promise<GamificationKpis> {
  const [xpAgg, xpAwardedRows, achievementsUnlocked, profiles, totalStudents, everEarnedXp, levels] = await Promise.all([
    prisma.userXpTransaction.aggregate({
      where: { createdAt: { gte: range.from, lte: range.to }, isReversed: false, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.userXpTransaction.findMany({
      where: { createdAt: { gte: range.from, lte: range.to }, isReversed: false, amount: { gt: 0 } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userAchievement.count({ where: { earnedAt: { gte: range.from, lte: range.to } } }),
    prisma.userGamificationProfile.findMany({ select: { currentStreak: true, totalXp: true } }),
    countTenantStudents(),
    prisma.userXpTransaction.findMany({ where: { amount: { gt: 0 }, isReversed: false }, distinct: ["userId"], select: { userId: true } }),
    prisma.gamificationLevel.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ]);

  const activeStreakProfiles = profiles.filter((p) => p.currentStreak >= 1);
  const averageCurrentStreak =
    activeStreakProfiles.length === 0 ? 0 : Math.round((activeStreakProfiles.reduce((s, p) => s + p.currentStreak, 0) / activeStreakProfiles.length) * 10) / 10;
  const longestCurrentStreak = profiles.reduce((max, p) => Math.max(max, p.currentStreak), 0);

  let averageLearnerLevelOrder: number | null = null;
  let averageLearnerLevelName: string | null = null;
  if (levels.length > 0 && profiles.length > 0) {
    const orders = profiles.map((p) => {
      let current = levels[0];
      for (const lvl of levels) if (p.totalXp >= lvl.minXp) current = lvl;
      return current.order;
    });
    const avgOrder = orders.reduce((s, o) => s + o, 0) / orders.length;
    averageLearnerLevelOrder = Math.round(avgOrder * 10) / 10;
    const nearest = levels.reduce((best, lvl) => (Math.abs(lvl.order - avgOrder) < Math.abs(best.order - avgOrder) ? lvl : best), levels[0]);
    averageLearnerLevelName = nearest.name;
  }

  return {
    totalXpAwarded: xpAgg._sum.amount ?? 0,
    learnersWhoEarnedXp: xpAwardedRows.length,
    achievementsUnlocked,
    activeStreaks: activeStreakProfiles.length,
    averageCurrentStreak,
    longestCurrentStreak,
    averageLearnerLevelOrder,
    averageLearnerLevelName,
    learnersWithNoGamificationActivity: Math.max(0, totalStudents - everEarnedXp.length),
  };
}

export type XpTrendPoint = { date: string } & Record<(typeof XP_CATEGORIES)[number], number>;

export async function getXpTrend(range: ResolvedRange): Promise<XpTrendPoint[]> {
  const rows = await prisma.userXpTransaction.findMany({
    where: { createdAt: { gte: range.from, lte: range.to }, isReversed: false, amount: { gt: 0 } },
    select: { amount: true, ruleCode: true, createdAt: true },
    take: ANALYTICS_ROW_CAP,
  });

  const byDay = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const key = dateKey(row.createdAt);
    const bucket = byDay.get(key) ?? Object.fromEntries(XP_CATEGORIES.map((c) => [c, 0]));
    const category = categoryFor(row.ruleCode);
    bucket[category] += row.amount;
    byDay.set(key, bucket);
  }

  const points: XpTrendPoint[] = [];
  const cursor = new Date(range.from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = dateKey(cursor);
    const bucket = byDay.get(key) ?? Object.fromEntries(XP_CATEGORIES.map((c) => [c, 0]));
    points.push({ date: key, ...(bucket as Record<(typeof XP_CATEGORIES)[number], number>) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

export type AchievementStat = { id: string; name: string; assetPath: string; category: string; earnedCount: number; percentOfAllLearners: number };

export async function getAchievementStats(): Promise<{ mostEarned: AchievementStat[]; rarest: AchievementStat[] }> {
  const [definitions, totalStudents] = await Promise.all([
    prisma.achievementDefinition.findMany({
      where: { isActive: true, isHidden: false },
      select: { id: true, name: true, assetPath: true, category: true, _count: { select: { userAchievements: true } } },
    }),
    countTenantStudents(),
  ]);

  const stats: AchievementStat[] = definitions.map((d) => ({
    id: d.id,
    name: d.name,
    assetPath: d.assetPath,
    category: d.category,
    earnedCount: d._count.userAchievements,
    percentOfAllLearners: totalStudents === 0 ? 0 : Math.round((d._count.userAchievements / totalStudents) * 1000) / 10,
  }));

  const mostEarned = [...stats].sort((a, b) => b.earnedCount - a.earnedCount).slice(0, 5);
  const rarest = [...stats]
    .filter((s) => s.earnedCount > 0)
    .sort((a, b) => a.earnedCount - b.earnedCount)
    .slice(0, 5);

  return { mostEarned, rarest };
}

const STREAK_BUCKETS = [
  { label: "No streak", min: 0, max: 0 },
  { label: "1-2 days", min: 1, max: 2 },
  { label: "3-6 days", min: 3, max: 6 },
  { label: "7-13 days", min: 7, max: 13 },
  { label: "14-29 days", min: 14, max: 29 },
  { label: "30+ days", min: 30, max: Infinity },
] as const;

export async function getStreakDistribution(): Promise<{ label: string; count: number }[]> {
  const profiles = await prisma.userGamificationProfile.findMany({ select: { currentStreak: true } });
  return STREAK_BUCKETS.map((b) => ({
    label: b.label,
    count: profiles.filter((p) => p.currentStreak >= b.min && p.currentStreak <= b.max).length,
  }));
}

export async function getLevelDistribution(): Promise<{ name: string; order: number; count: number; percent: number }[]> {
  const [levels, profiles] = await Promise.all([
    prisma.gamificationLevel.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.userGamificationProfile.findMany({ select: { totalXp: true } }),
  ]);
  if (levels.length === 0) return [];

  const counts = new Map(levels.map((l) => [l.order, 0]));
  for (const p of profiles) {
    let current = levels[0];
    for (const lvl of levels) if (p.totalXp >= lvl.minXp) current = lvl;
    counts.set(current.order, (counts.get(current.order) ?? 0) + 1);
  }

  const total = profiles.length;
  return levels.map((l) => ({
    name: l.name,
    order: l.order,
    count: counts.get(l.order) ?? 0,
    percent: total === 0 ? 0 : Math.round(((counts.get(l.order) ?? 0) / total) * 1000) / 10,
  }));
}

export function sparklineFromTrend(points: XpTrendPoint[]): number[] {
  const values = points.map((p) => XP_CATEGORIES.reduce((s, c) => s + p[c], 0));
  return downsample(values);
}

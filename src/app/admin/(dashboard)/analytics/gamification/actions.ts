"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getAchievementStats, getStreakDistribution, getLevelDistribution, getXpTrend } from "@/lib/analytics/gamification-analytics";
import { XP_CATEGORIES } from "@/lib/analytics/definitions";

export async function exportGamificationCsv(params: { range?: string; from?: string; to?: string }): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const [xpTrend, achievements, streaks, levels] = await Promise.all([
    getXpTrend(range),
    getAchievementStats(),
    getStreakDistribution(),
    getLevelDistribution(),
  ]);

  const sections: string[][] = [];
  sections.push(["XP Trend"]);
  sections.push(["Date", ...XP_CATEGORIES]);
  for (const p of xpTrend) sections.push([p.date, ...XP_CATEGORIES.map((c) => String(p[c]))]);

  sections.push([]);
  sections.push(["Most Earned Achievements"]);
  sections.push(["Name", "Earned Count", "% of All Learners"]);
  for (const a of achievements.mostEarned) sections.push([a.name, String(a.earnedCount), String(a.percentOfAllLearners)]);

  sections.push([]);
  sections.push(["Rarest Achievements"]);
  sections.push(["Name", "Earned Count", "% of All Learners"]);
  for (const a of achievements.rarest) sections.push([a.name, String(a.earnedCount), String(a.percentOfAllLearners)]);

  sections.push([]);
  sections.push(["Streak Distribution"]);
  sections.push(["Bucket", "Count"]);
  for (const s of streaks) sections.push([s.label, String(s.count)]);

  sections.push([]);
  sections.push(["Level Distribution"]);
  sections.push(["Level", "Count", "Percent"]);
  for (const l of levels) sections.push([l.name, String(l.count), String(l.percent)]);

  return buildCsv(sections);
}

import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import {
  getGamificationKpis,
  getXpTrend,
  getAchievementStats,
  getStreakDistribution,
  getLevelDistribution,
} from "@/lib/analytics/gamification-analytics";
import { getStreakEngagementComparison } from "@/lib/analytics/gamification-comparison";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import ComparisonPanel from "@/components/analytics/ComparisonPanel";
import XpTrendChart from "./XpTrendChart";
import AchievementLists from "./AchievementLists";
import DistributionBars from "./DistributionBars";
import { exportGamificationCsv } from "./actions";
import { ZapIcon, UsersIcon, TrophyIcon, FlameIcon, TrendingUpIcon, StarIcon, UserXIcon } from "lucide-react";

type SearchParams = { range?: string; from?: string; to?: string };

export default async function GamificationAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);

  const [kpis, xpTrend, achievements, streaks, levels, comparison] = await Promise.all([
    getGamificationKpis(range),
    getXpTrend(range),
    getAchievementStats(),
    getStreakDistribution(),
    getLevelDistribution(),
    getStreakEngagementComparison(range),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gamification Analytics</h1>
          <p className="text-sm text-muted-foreground">XP, streaks, levels, and achievements across the platform.</p>
        </div>
        <DownloadCsvButton action={exportGamificationCsv.bind(null, { range: params.range, from: params.from, to: params.to })} filenamePrefix="gamification" />
      </div>

      <AnalyticsFilterBar />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total XP Awarded" value={kpis.totalXpAwarded.toLocaleString()} icon={ZapIcon} />
        <KpiCard label="Learners Who Earned XP" value={kpis.learnersWhoEarnedXp.toLocaleString()} icon={UsersIcon} />
        <KpiCard label="Achievements Unlocked" value={kpis.achievementsUnlocked.toLocaleString()} icon={TrophyIcon} />
        <KpiCard label="Active Streaks" value={kpis.activeStreaks.toLocaleString()} icon={FlameIcon} tooltip="Learners with a current streak of 1 day or longer." />
        <KpiCard label="Average Current Streak" value={`${kpis.averageCurrentStreak} days`} icon={TrendingUpIcon} />
        <KpiCard label="Longest Current Streak" value={`${kpis.longestCurrentStreak} days`} icon={FlameIcon} />
        <KpiCard label="Average Learner Level" value={kpis.averageLearnerLevelName ?? "—"} icon={StarIcon} />
        <KpiCard label="No Gamification Activity" value={kpis.learnersWithNoGamificationActivity.toLocaleString()} icon={UserXIcon} />
      </div>

      <XpTrendChart points={xpTrend} />

      <AchievementLists mostEarned={achievements.mostEarned} rarest={achievements.rarest} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionBars title="Streak Distribution" data={streaks} />
        <DistributionBars title="Level Distribution" data={levels.map((l) => ({ label: l.name, count: l.count }))} />
      </div>

      <ComparisonPanel title="Gamification Engagement Comparison" withLabel="Active streak" withoutLabel="No streak" result={comparison} />
    </div>
  );
}

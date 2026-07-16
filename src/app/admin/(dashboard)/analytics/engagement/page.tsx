import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getEngagementKpis } from "@/lib/analytics/engagement";
import { getActiveLearnerTrend } from "@/lib/analytics/active-learner-trend";
import { getEngagementDistribution } from "@/lib/analytics/learner-segments";
import { getSegmentTransitions } from "@/lib/analytics/segment-history";
import { getActivityHeatmap, type HeatmapActivityType } from "@/lib/analytics/heatmap";
import { getConsistencyMetrics } from "@/lib/analytics/consistency";
import { getDeterministicInsights } from "@/lib/analytics/insights";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import ActivityHeatmap from "@/components/analytics/ActivityHeatmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import ActiveLearnerTrendChart from "./ActiveLearnerTrendChart";
import EngagementDistribution from "../learners/EngagementDistribution";
import SegmentTransitions from "./SegmentTransitions";
import ConsistencyPanel from "./ConsistencyPanel";
import InsightsPanel from "./InsightsPanel";
import HeatmapControls from "./HeatmapControls";
import { exportSegmentTransitionsCsv } from "./actions";
import { AlertTriangleIcon, UsersIcon, CalendarDaysIcon, ZapIcon, RepeatIcon, ClockIcon, ActivityIcon, TrendingUpIcon } from "lucide-react";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  heatmapType?: string;
};

export default async function EngagementOverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const heatmapType: HeatmapActivityType = (["all", "learning", "quiz", "community"] as const).includes(params.heatmapType as HeatmapActivityType)
    ? (params.heatmapType as HeatmapActivityType)
    : "all";

  const [kpis, trend, distribution, transitions, heatmap, consistency, insights, courses] = await Promise.all([
    getEngagementKpis({ range, courseId }),
    getActiveLearnerTrend(range, courseId),
    getEngagementDistribution(),
    getSegmentTransitions(range),
    getActivityHeatmap({ range, courseId, activityType: heatmapType }),
    getConsistencyMetrics(range, courseId),
    getDeterministicInsights(range),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const filterQuery = new URLSearchParams();
  filterQuery.set("range", range.key);
  if (params.from) filterQuery.set("from", params.from);
  if (params.to) filterQuery.set("to", params.to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Engagement Intelligence</h1>
          <p className="text-sm text-muted-foreground">Who&apos;s learning, who&apos;s slowing down, and who&apos;s at risk of disengaging.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/analytics/engagement/at-risk?${filterQuery.toString()}`}>
            <AlertTriangleIcon className="size-4" />
            View At-Risk Learners
          </Link>
        </Button>
      </div>

      <AnalyticsFilterBar courses={courses} />

      <InsightsPanel insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Daily Active Learners" value={kpis.dau.value.toLocaleString()} changePercent={kpis.dau.changePercent} sparkline={kpis.dau.sparkline} icon={UsersIcon} tooltip={METRIC_TOOLTIPS.dau} />
        <KpiCard label="Weekly Active Learners" value={kpis.wau.value.toLocaleString()} changePercent={kpis.wau.changePercent} icon={CalendarDaysIcon} tooltip={METRIC_TOOLTIPS.wau} />
        <KpiCard label="Monthly Active Learners" value={kpis.mau.value.toLocaleString()} changePercent={kpis.mau.changePercent} icon={CalendarDaysIcon} tooltip={METRIC_TOOLTIPS.mau} />
        <KpiCard label="Stickiness" value={`${kpis.stickiness.value}%`} changePercent={kpis.stickiness.changePercent} icon={ZapIcon} tooltip={METRIC_TOOLTIPS.stickiness} />
        <KpiCard label="Avg. Active Days / Learner" value={kpis.avgActiveDaysPerLearner.value} changePercent={kpis.avgActiveDaysPerLearner.changePercent} icon={ActivityIcon} tooltip={METRIC_TOOLTIPS.avgActiveDaysPerLearner} />
        <KpiCard label="Avg. Learning Minutes / Active Learner" value={kpis.avgLearningMinutesPerActiveLearner.value} changePercent={kpis.avgLearningMinutesPerActiveLearner.changePercent} icon={ClockIcon} tooltip={METRIC_TOOLTIPS.avgLearningMinutesPerActiveLearner} />
        <KpiCard label="Returning Learner Rate" value={`${kpis.returningLearnerRate.value}%`} changePercent={kpis.returningLearnerRate.changePercent} icon={RepeatIcon} tooltip={METRIC_TOOLTIPS.returningLearnerRate} />
        <KpiCard
          label="At-Risk Learners"
          value={kpis.atRiskLearners.value.toLocaleString()}
          icon={TrendingUpIcon}
          tooltip={METRIC_TOOLTIPS.atRiskLearnersKpi}
          className="border-warning/30"
        />
      </div>

      <ActiveLearnerTrendChart points={trend.points} granularity={trend.granularity} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EngagementDistribution data={distribution} activeSegment={undefined} />
        <div className="space-y-2">
          <SegmentTransitions result={transitions} />
          {!transitions.insufficientData && (
            <DownloadCsvButton action={exportSegmentTransitionsCsv.bind(null, { range: params.range, from: params.from, to: params.to })} filenamePrefix="segment-transitions" />
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Activity Heatmap</CardTitle>
            <p className="text-xs text-muted-foreground">Learner-local day and hour. Darker = more activity.</p>
          </div>
          <HeatmapControls current={heatmapType} />
        </CardHeader>
        <CardContent>
          <ActivityHeatmap cells={heatmap.cells} metric="uniqueLearners" />
          {heatmap.truncated && <p className="mt-2 text-xs text-muted-foreground">Showing a bounded sample of events for this range.</p>}
        </CardContent>
      </Card>

      <ConsistencyPanel metrics={consistency} />
    </div>
  );
}

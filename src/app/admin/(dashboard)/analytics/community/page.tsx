import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import {
  getCommunityKpis,
  getCommunityActivityTrend,
  getTopContributors,
  getLearningCommunityOverlap,
  getCommunityLearningCorrelation,
} from "@/lib/analytics/community-analytics";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import ComparisonPanel from "@/components/analytics/ComparisonPanel";
import CommunityTrendChart from "./CommunityTrendChart";
import TopContributorsTable from "./TopContributorsTable";
import OverlapCard from "./OverlapCard";
import { exportTopContributorsCsv } from "./actions";
import { UsersIcon, MessageSquareIcon, MessageSquareReplyIcon, PercentIcon, CheckCircle2Icon, ZapIcon } from "lucide-react";

type SearchParams = { range?: string; from?: string; to?: string };

export default async function CommunityAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);

  const [kpis, trend, contributors, overlap, correlation] = await Promise.all([
    getCommunityKpis(range),
    getCommunityActivityTrend(range),
    getTopContributors(range),
    getLearningCommunityOverlap(range),
    getCommunityLearningCorrelation(range),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Community Analytics</h1>
          <p className="text-sm text-muted-foreground">How active the community is, and how it relates to learning.</p>
        </div>
        <DownloadCsvButton action={exportTopContributorsCsv.bind(null, { range: params.range, from: params.from, to: params.to })} filenamePrefix="community-top-contributors" />
      </div>

      <AnalyticsFilterBar />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Community Participants" value={kpis.activeParticipants.toLocaleString()} icon={UsersIcon} tooltip={METRIC_TOOLTIPS.communityParticipant} />
        <KpiCard label="Posts Created" value={kpis.postsCreated.toLocaleString()} icon={MessageSquareIcon} />
        <KpiCard label="Replies Created" value={kpis.repliesCreated.toLocaleString()} icon={MessageSquareReplyIcon} />
        <KpiCard label="Community Participation Rate" value={`${kpis.participationRatePercent}%`} icon={PercentIcon} tooltip="Community participants divided by learners with an active enrollment." />
        <KpiCard label="Helpful Answers" value={kpis.helpfulAnswers.toLocaleString()} icon={CheckCircle2Icon} tooltip="Answers accepted by the question's author." />
        <KpiCard label="Community XP Awarded" value={kpis.communityXpAwarded.toLocaleString()} icon={ZapIcon} />
      </div>

      <CommunityTrendChart points={trend} />

      <TopContributorsTable rows={contributors} />

      <OverlapCard overlap={overlap} />

      <ComparisonPanel title="Community & Learning Correlation" withLabel="Community participants" withoutLabel="Non-participants" result={correlation} />
    </div>
  );
}

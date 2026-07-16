import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getLearnerKpis, getLearnerTable, type LearnerRow } from "@/lib/analytics/learners";
import { getEngagementDistribution } from "@/lib/analytics/learner-segments";
import { formatHours } from "@/lib/analytics/format";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import EngagementDistribution from "./EngagementDistribution";
import LearnerTable from "./LearnerTable";
import { exportLearnersCsv } from "./actions";
import { UsersIcon, UserPlusIcon, ActivityIcon, RepeatIcon, UserXIcon, AlertTriangleIcon, ClockIcon, BookOpenIcon } from "lucide-react";
import type { EngagementSegment } from "@/lib/analytics/learner-segments";
import type { FunnelStage } from "@/lib/analytics/definitions";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  courseStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  funnelStage?: string;
  segment?: string;
  page?: string;
  sort?: string;
  sortDir?: string;
  q?: string;
};

const PAGE_SIZE = 25;

export default async function LearnersAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const sort = (params.sort as keyof LearnerRow) ?? "name";
  const sortDir: "asc" | "desc" = params.sortDir === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q ?? "";

  const tableParams = {
    search: q || undefined,
    sort,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
    segment: params.segment as EngagementSegment | undefined,
    courseId: params.courseId,
    courseStatus: params.courseStatus,
    funnelStage: params.funnelStage as FunnelStage | undefined,
  };

  const [kpis, distribution, table, courses] = await Promise.all([
    getLearnerKpis(range),
    getEngagementDistribution(),
    getLearnerTable(tableParams),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const otherParams = {
    range: params.range,
    from: params.from,
    to: params.to,
    courseId: params.courseId,
    courseStatus: params.courseStatus,
    funnelStage: params.funnelStage,
    segment: params.segment,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Learner Analytics</h1>
          <p className="text-sm text-muted-foreground">Engagement, progress, and risk across every learner.</p>
        </div>
        <DownloadCsvButton action={exportLearnersCsv.bind(null, tableParams)} filenamePrefix="learners" />
      </div>

      <AnalyticsFilterBar courses={courses} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Learners" value={kpis.totalLearners.toLocaleString()} icon={UsersIcon} />
        <KpiCard label="New Learners" value={kpis.newLearners.toLocaleString()} icon={UserPlusIcon} />
        <KpiCard label="Active Learners" value={kpis.activeLearners.toLocaleString()} icon={ActivityIcon} />
        <KpiCard label="Returning Learners" value={kpis.returningLearners.toLocaleString()} icon={RepeatIcon} />
        <KpiCard label="Inactive Learners" value={kpis.inactiveLearners.toLocaleString()} icon={UserXIcon} />
        <KpiCard label="At-Risk Learners" value={kpis.atRiskLearners.toLocaleString()} icon={AlertTriangleIcon} />
        <KpiCard label="Avg. Learning Time / Learner" value={formatHours(kpis.averageLearningTimeSeconds)} icon={ClockIcon} />
        <KpiCard label="Avg. Courses / Learner" value={kpis.averageCoursesPerLearner} icon={BookOpenIcon} />
      </div>

      <EngagementDistribution data={distribution} activeSegment={params.segment} />

      <LearnerTable rows={table.rows} total={table.total} page={page} q={q} sort={sort} sortDir={sortDir} otherParams={otherParams} />
    </div>
  );
}

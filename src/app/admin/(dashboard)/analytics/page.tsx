import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getOverviewKpis, getActivityTrend } from "@/lib/analytics/overview";
import { getEnrollmentFunnel } from "@/lib/analytics/funnel";
import { getCoursePerformanceRows, type CoursePerformanceRow } from "@/lib/analytics/courses";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import { formatHours } from "@/lib/analytics/format";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import ActivityTrendChart from "./ActivityTrendChart";
import EnrollmentFunnel from "./EnrollmentFunnel";
import CoursePerformanceTable from "./CoursePerformanceTable";
import { exportCoursePerformanceCsv } from "./actions";
import {
  UsersIcon,
  ActivityIcon,
  ClipboardListIcon,
  CheckCircle2Icon,
  PercentIcon,
  ClockIcon,
  TargetIcon,
  BanknoteIcon,
} from "lucide-react";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  page?: string;
  sort?: string;
  sortDir?: string;
  q?: string;
};

function sortRows(rows: CoursePerformanceRow[], sort: string, dir: "asc" | "desc"): CoursePerformanceRow[] {
  const key = sort as keyof CoursePerformanceRow;
  const factor = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * factor;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    if (av === null) return 1;
    if (bv === null) return -1;
    return 0;
  });
}

const PAGE_SIZE = 10;

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const sort = params.sort ?? "totalEnrollments";
  const sortDir: "asc" | "desc" = params.sortDir === "asc" ? "asc" : "desc";
  const q = params.q ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const [kpis, trend, funnelStages, courses, matchedCourseRows] = await Promise.all([
    getOverviewKpis({ range, courseId }),
    getActivityTrend({ range, courseId }),
    getEnrollmentFunnel(courseId, { from: range.from, to: range.to }),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    getCoursePerformanceRows(courseId, range, q || undefined),
  ]);

  // Course count is small (bounded by the catalog, not learner count), so
  // sorting/paginating the already-DB-filtered result in JS here is fine —
  // see the scalability note in courses.ts for the threshold to revisit.
  const sortedRows = sortRows(matchedCourseRows, sort, sortDir);
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const otherParams = { range: params.range, from: params.from, to: params.to, courseId: params.courseId };
  const learnersHref = (stage: string) => {
    const search = new URLSearchParams();
    search.set("funnelStage", stage);
    if (courseId) search.set("courseId", courseId);
    search.set("range", range.key);
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    return `/admin/analytics/learners?${search.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide learning activity, enrollment health, and revenue at a glance.
          </p>
        </div>
        <DownloadCsvButton
          action={exportCoursePerformanceCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
            courseId: params.courseId,
            q: params.q,
          })}
          filenamePrefix="course-performance"
        />
      </div>

      <AnalyticsFilterBar courses={courses} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Learners" value={kpis.totalLearners.value.toLocaleString()} changePercent={kpis.totalLearners.changePercent} icon={UsersIcon} tooltip={METRIC_TOOLTIPS.totalLearners} />
        <KpiCard label="Active Learners" value={kpis.activeLearners.value.toLocaleString()} changePercent={kpis.activeLearners.changePercent} sparkline={kpis.activeLearners.sparkline} icon={ActivityIcon} tooltip={METRIC_TOOLTIPS.activeLearners} />
        <KpiCard label="Total Enrollments" value={kpis.totalEnrollments.value.toLocaleString()} changePercent={kpis.totalEnrollments.changePercent} sparkline={kpis.totalEnrollments.sparkline} icon={ClipboardListIcon} tooltip={METRIC_TOOLTIPS.totalEnrollments} />
        <KpiCard label="Course Completions" value={kpis.courseCompletions.value.toLocaleString()} changePercent={kpis.courseCompletions.changePercent} icon={CheckCircle2Icon} tooltip={METRIC_TOOLTIPS.courseCompletions} />
        <KpiCard label="Completion Rate" value={`${kpis.completionRate.value}%`} changePercent={kpis.completionRate.changePercent} icon={PercentIcon} tooltip={METRIC_TOOLTIPS.completionRate} />
        <KpiCard label="Total Learning Time" value={formatHours(kpis.totalLearningTimeSeconds.value)} changePercent={kpis.totalLearningTimeSeconds.changePercent} sparkline={kpis.totalLearningTimeSeconds.sparkline} icon={ClockIcon} tooltip={METRIC_TOOLTIPS.totalLearningTime} />
        <KpiCard label="Average Quiz Score" value={kpis.averageQuizScore.value === 0 ? "—" : `${kpis.averageQuizScore.value}%`} changePercent={kpis.averageQuizScore.changePercent} icon={TargetIcon} tooltip={METRIC_TOOLTIPS.averageQuizScore} />
        <KpiCard
          label="Revenue"
          value={kpis.revenue.value > 0 ? `${kpis.revenue.currencyLabel} ${kpis.revenue.value.toLocaleString()}` : "—"}
          changePercent={kpis.revenue.changePercent}
          icon={BanknoteIcon}
          tooltip={METRIC_TOOLTIPS.revenue}
        />
      </div>

      <ActivityTrendChart data={trend} courseScoped={Boolean(courseId)} />

      <EnrollmentFunnel stages={funnelStages} learnersHref={learnersHref} />

      <CoursePerformanceTable
        rows={pageRows}
        total={sortedRows.length}
        page={page}
        q={q}
        sort={sort}
        sortDir={sortDir}
        otherParams={otherParams}
      />
    </div>
  );
}

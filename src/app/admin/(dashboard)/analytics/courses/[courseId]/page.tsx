import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, UsersIcon, ActivityIcon, PercentIcon, ClockIcon, TargetIcon, BanknoteIcon, CalendarClockIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getCourseDetailKpis } from "@/lib/analytics/courses";
import { getLessonDropoff, sortDropoffRows, type DropoffSort } from "@/lib/analytics/lesson-dropoff";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import { formatHours, formatCurrency } from "@/lib/analytics/format";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import StatusDistribution from "./StatusDistribution";
import LessonDropoffTable from "./LessonDropoffTable";
import { exportLessonDropoffCsv } from "./actions";

type SearchParams = { range?: string; from?: string; to?: string; sort?: string };

export default async function CourseAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { courseId } = await params;
  const search = await searchParams;
  const range = resolveDateRange(search);
  const sort = (search.sort as DropoffSort) ?? "order";

  const [kpis, dropoff] = await Promise.all([getCourseDetailKpis(courseId, range), getLessonDropoff(courseId)]);
  if (!kpis) notFound();

  const sortedRows = sortDropoffRows(dropoff.rows, sort);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" />
          Back to Analytics
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{kpis.title}</h1>
          <p className="text-sm text-muted-foreground">Course-level analytics and lesson drop-off.</p>
        </div>
        <DownloadCsvButton action={exportLessonDropoffCsv.bind(null, courseId, sort)} filenamePrefix={`lesson-dropoff-${courseId}`} />
      </div>

      <AnalyticsFilterBar />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Enrollments" value={kpis.totalEnrollments.toLocaleString()} icon={UsersIcon} />
        <KpiCard label="Active Learners" value={kpis.activeLearners.toLocaleString()} icon={ActivityIcon} tooltip={METRIC_TOOLTIPS.activeLearners} />
        <KpiCard label="Completion Rate" value={`${kpis.completionRate}%`} icon={PercentIcon} tooltip={METRIC_TOOLTIPS.completionRate} />
        <KpiCard label="Average Progress" value={`${kpis.averageProgress}%`} tooltip={METRIC_TOOLTIPS.courseAvgProgress} />
        <KpiCard
          label="Avg. Time to Completion"
          value={kpis.averageTimeToCompletionDays === null ? "—" : `${kpis.averageTimeToCompletionDays}d`}
          icon={CalendarClockIcon}
        />
        <KpiCard label="Total Learning Hours" value={formatHours(kpis.totalLearningTimeSeconds)} icon={ClockIcon} tooltip={METRIC_TOOLTIPS.courseLearningTime} />
        <KpiCard label="Average Quiz Score" value={kpis.averageQuizScore === null ? "—" : `${kpis.averageQuizScore}%`} icon={TargetIcon} />
        <KpiCard label="Revenue Generated" value={formatCurrency(kpis.revenue, kpis.currencyLabel)} icon={BanknoteIcon} tooltip={METRIC_TOOLTIPS.revenue} />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-foreground">Course Status Distribution</h3>
        <StatusDistribution courseId={courseId} notStarted={kpis.notStarted} inProgress={kpis.inProgress} completed={kpis.completed} />
      </div>

      {dropoff.insight && (
        <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-foreground">
          <span className="font-medium">Insight:</span> {dropoff.insight.stoppedAfterPercent}% of learners stop
          progressing after <span className="font-medium">{dropoff.insight.lessonTitle}</span>.
        </div>
      )}

      <LessonDropoffTable courseId={courseId} rows={sortedRows} sort={sort} />
    </div>
  );
}

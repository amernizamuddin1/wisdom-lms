import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getRetentionCohorts, type CohortGranularity } from "@/lib/analytics/retention";
import { getReturningLearnerTrend } from "@/lib/analytics/returning";
import { getCourseEngagementComparison, type CourseEngagementRow } from "@/lib/analytics/course-engagement";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CohortHeatmap from "./CohortHeatmap";
import GranularityToggle from "./GranularityToggle";
import ReturningTrendChart from "./ReturningTrendChart";
import CourseEngagementTable from "./CourseEngagementTable";
import { exportRetentionCohortsCsv, exportCourseEngagementCsv } from "./actions";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  cohort?: string;
  page?: string;
  sort?: string;
  sortDir?: string;
  q?: string;
};

const PAGE_SIZE = 10;

export default async function RetentionPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const granularity: CohortGranularity = params.cohort === "month" ? "month" : "week";
  const sort = (params.sort as keyof CourseEngagementRow) ?? "enrollments";
  const sortDir: "asc" | "desc" = params.sortDir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q ?? "";

  const courseTableParams = { range, search: q || undefined, sort, sortDir, page, pageSize: PAGE_SIZE };

  const [cohorts, returningTrend, courseTable, courses] = await Promise.all([
    getRetentionCohorts({ granularity, courseId }),
    getReturningLearnerTrend(range),
    getCourseEngagementComparison(courseTableParams),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const courseTableOtherParams = { range: params.range, from: params.from, to: params.to };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Retention</h1>
        <p className="text-sm text-muted-foreground">
          Cohorts grouped by first enrollment week/month. Retained = had meaningful activity during that cohort-relative period.
        </p>
      </div>

      <AnalyticsFilterBar courses={courses} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Retention Cohorts</CardTitle>
            <p className="text-xs text-muted-foreground">Cohort basis: first enrollment.</p>
          </div>
          <div className="flex items-center gap-2">
            <GranularityToggle current={granularity} />
            <DownloadCsvButton action={exportRetentionCohortsCsv.bind(null, { granularity, courseId: params.courseId })} filenamePrefix="retention-cohorts" />
          </div>
        </CardHeader>
        <CardContent>
          <CohortHeatmap rows={cohorts.rows} maxPeriods={cohorts.maxPeriods} granularity={granularity} />
        </CardContent>
      </Card>

      <ReturningTrendChart points={returningTrend.points} />

      <div className="flex justify-end">
        <DownloadCsvButton action={exportCourseEngagementCsv.bind(null, { ...courseTableOtherParams, search: q || undefined, sort, sortDir })} filenamePrefix="course-engagement" />
      </div>
      <CourseEngagementTable rows={courseTable.rows} total={courseTable.total} page={page} q={q} sort={sort} sortDir={sortDir} otherParams={courseTableOtherParams} />
    </div>
  );
}

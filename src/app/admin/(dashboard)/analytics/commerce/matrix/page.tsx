import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getRevenueVsEngagementMatrix } from "@/lib/analytics/commerce-engagement-matrix";
import {
  COMMERCE_METRIC_TOOLTIPS,
  REVENUE_ENGAGEMENT_QUADRANT_LABELS,
  REVENUE_ENGAGEMENT_QUADRANTS,
} from "@/lib/analytics/definitions";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import RevenueEngagementMatrixChart from "./RevenueEngagementMatrixChart";
import { exportRevenueEngagementMatrixCsv } from "./actions";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
};

export default async function RevenueEngagementMatrixPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);

  const { courses, medianRevenue, medianCompletionRate } = await getRevenueVsEngagementMatrix(range);

  const byQuadrant = REVENUE_ENGAGEMENT_QUADRANTS.map((quadrant) => ({
    quadrant,
    courses: courses.filter((c) => c.quadrant === quadrant),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-semibold text-foreground">Revenue vs. Engagement Matrix</h1>
            <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.revenueEngagementQuadrant} />
          </div>
          <p className="text-sm text-muted-foreground">
            Courses classified by revenue and completion rate, each split at the platform median, into four
            quadrants.
          </p>
        </div>
        <DownloadCsvButton
          action={exportRevenueEngagementMatrixCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
          })}
          filenamePrefix="revenue-engagement-matrix"
        />
      </div>

      <AnalyticsFilterBar />

      <RevenueEngagementMatrixChart courses={courses} medianRevenue={medianRevenue} medianCompletionRate={medianCompletionRate} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {byQuadrant.map(({ quadrant, courses: quadrantCourses }) => (
          <div key={quadrant} className="space-y-3 rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-foreground">{REVENUE_ENGAGEMENT_QUADRANT_LABELS[quadrant]}</h3>
            {quadrantCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses in this quadrant.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {quadrantCourses.map((c) => (
                  <li key={c.courseId} className="flex items-center justify-between gap-3 py-2">
                    <span className="line-clamp-1 font-medium text-foreground" title={c.title}>
                      {c.title}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {c.revenue.toLocaleString()} rev · {c.completionRate}% completion
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

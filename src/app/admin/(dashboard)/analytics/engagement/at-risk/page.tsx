import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getAtRiskLearnerRows, getAtRiskSummary, type AtRiskRow } from "@/lib/analytics/at-risk";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AtRiskTable from "./AtRiskTable";
import { exportAtRiskLearnersCsv } from "./actions";
import { AlertTriangleIcon, UserPlusIcon, RepeatIcon, ClockIcon } from "lucide-react";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  sort?: string;
  sortDir?: string;
  q?: string;
};

const PAGE_SIZE = 25;

export default async function AtRiskLearnersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const sort = (params.sort as keyof AtRiskRow) ?? "daysInactive";
  const sortDir: "asc" | "desc" = params.sortDir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q ?? "";

  const tableParams = { search: q || undefined, sort, sortDir, page, pageSize: PAGE_SIZE };

  const [summary, table] = await Promise.all([getAtRiskSummary(range), getAtRiskLearnerRows(tableParams)]);

  const otherParams = { range: params.range, from: params.from, to: params.to };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">At-Risk Learner Intelligence</h1>
          <p className="text-sm text-muted-foreground">Learners with an incomplete course and no meaningful activity in the configured window.</p>
        </div>
        <DownloadCsvButton action={exportAtRiskLearnersCsv.bind(null, tableParams)} filenamePrefix="at-risk-learners" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total At-Risk" value={summary.total.toLocaleString()} icon={AlertTriangleIcon} tooltip={METRIC_TOOLTIPS.engagementSegmentAtRisk} />
        <KpiCard label="Newly At-Risk" value={summary.newlyAtRisk.toLocaleString()} icon={UserPlusIcon} tooltip="Learners who moved into the At-Risk segment during the selected range (requires segment history)." />
        <KpiCard label="Recovered" value={summary.recovered.toLocaleString()} icon={RepeatIcon} tooltip="Learners who moved from At-Risk or Dormant to Active or better during the selected range." />
        <KpiCard label="Avg. Days Inactive" value={summary.averageDaysInactive} icon={ClockIcon} />
      </div>

      {summary.topCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Courses With the Most At-Risk Learners</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.topCourses.map((c) => (
                <li key={c.courseId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{c.title}</span>
                  <span className="text-muted-foreground">{c.atRiskCount} at-risk learners</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AtRiskTable rows={table.rows} total={table.total} page={page} q={q} sort={sort} sortDir={sortDir} otherParams={otherParams} />
    </div>
  );
}

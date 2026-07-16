import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import SortableHeader from "@/components/analytics/SortableHeader";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import type { CoursePerformanceRow } from "@/lib/analytics/courses";

const PAGE_SIZE = 10;

export default function CoursePerformanceTable({
  rows,
  total,
  page,
  q,
  sort,
  sortDir,
  otherParams,
}: {
  rows: CoursePerformanceRow[];
  total: number;
  page: number;
  q: string;
  sort: string;
  sortDir: "asc" | "desc";
  otherParams: Record<string, string | undefined>;
}) {
  const basePath = "/admin/analytics";
  const linkParams = { ...otherParams, q: q || undefined };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">Course Performance</h3>
        <form method="get" className="flex items-center gap-2">
          {Object.entries(otherParams).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search courses..."
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-56"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Course" sortKey="title" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Enrollments" sortKey="totalEnrollments" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3 font-medium">Not Started</th>
              <th className="px-4 py-3 font-medium">In Progress</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3">
                <SortableHeader label="Completion Rate" sortKey="completionRate" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="Avg Progress" sortKey="averageProgress" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
                  <InfoTooltip text={METRIC_TOOLTIPS.courseAvgProgress} />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="Learning Time" sortKey="learningTimeSeconds" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
                  <InfoTooltip text={METRIC_TOOLTIPS.courseLearningTime} />
                </div>
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Avg Quiz Score" sortKey="averageQuizScore" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Revenue" sortKey="revenue" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.courseId} className="hover:bg-muted/50">
                <td className="max-w-[260px] px-4 py-3">
                  <Link
                    href={`/admin/analytics/courses/${r.courseId}`}
                    className="line-clamp-2 font-medium text-foreground hover:text-primary hover:underline"
                    title={r.title}
                  >
                    {r.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={r.status === "PUBLISHED" ? "success" : "outline"}>{r.status}</Badge>
                    {r.learningStatus === "PAUSED" && <Badge variant="destructive">Paused</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.totalEnrollments}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.notStarted}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.inProgress}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.completed}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.completionRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{r.averageProgress}%</td>
                <td className="px-4 py-3 text-muted-foreground">{Math.round((r.learningTimeSeconds / 3600) * 10) / 10}h</td>
                <td className="px-4 py-3 text-muted-foreground">{r.averageQuizScore ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.revenue > 0 ? `${r.currencyLabel} ${r.revenue.toLocaleString()}` : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  No courses match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => {
          const search = new URLSearchParams();
          for (const [k, v] of Object.entries(linkParams)) if (v) search.set(k, v);
          search.set("sort", sort);
          search.set("sortDir", sortDir);
          search.set("page", String(p));
          return `${basePath}?${search.toString()}`;
        }}
      />
    </div>
  );
}

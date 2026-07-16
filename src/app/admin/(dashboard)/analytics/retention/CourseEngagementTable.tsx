import { Pagination } from "@/components/ui/pagination";
import SortableHeader from "@/components/analytics/SortableHeader";
import type { CourseEngagementRow } from "@/lib/analytics/course-engagement";

const PAGE_SIZE = 10;

export default function CourseEngagementTable({
  rows,
  total,
  page,
  q,
  sort,
  sortDir,
  otherParams,
}: {
  rows: CourseEngagementRow[];
  total: number;
  page: number;
  q: string;
  sort: string;
  sortDir: "asc" | "desc";
  otherParams: Record<string, string | undefined>;
}) {
  const basePath = "/admin/analytics/retention";
  const linkParams = { ...otherParams, q: q || undefined };

  const bestReturnRate = Math.max(0, ...rows.map((r) => r.returningLearnerRatePercent));
  const worstAtRiskRate = Math.max(0, ...rows.map((r) => r.atRiskRatePercent));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">Course Engagement Comparison</h3>
        <form method="get" className="flex items-center gap-2">
          {Object.entries(otherParams).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search courses..."
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-64"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1300px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3"><SortableHeader label="Course" sortKey="title" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3"><SortableHeader label="Enrollments" sortKey="enrollments" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3"><SortableHeader label="Active Learners" sortKey="activeLearners" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3"><SortableHeader label="Active Rate" sortKey="activeLearnerRatePercent" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3"><SortableHeader label="Avg Active Days" sortKey="averageActiveDays" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3"><SortableHeader label="Completion Rate" sortKey="completionRatePercent" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3"><SortableHeader label="At-Risk Rate" sortKey="atRiskRatePercent" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3"><SortableHeader label="Return Rate" sortKey="returningLearnerRatePercent" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} /></th>
              <th className="px-4 py-3 font-medium">Community</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.courseId} className="hover:bg-muted/50">
                <td className="max-w-[220px] px-4 py-3 font-medium text-foreground">
                  <span className="block truncate" title={r.title}>{r.title}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.enrollments}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.activeLearners}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.activeLearnerRatePercent}%</td>
                <td className="px-4 py-3 text-muted-foreground">{r.averageActiveDays}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.completionRatePercent}%</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.atRiskRatePercent}%
                  {r.atRiskRatePercent === worstAtRiskRate && worstAtRiskRate > 0 && <span className="ml-1.5 text-[11px] text-destructive">Highest at-risk rate</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.returningLearnerRatePercent}%
                  {r.returningLearnerRatePercent === bestReturnRate && bestReturnRate > 0 && <span className="ml-1.5 text-[11px] text-success">Highest return rate</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.communityParticipationRatePercent === null ? "—" : `${r.communityParticipationRatePercent}%`}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No courses match these filters.</td>
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

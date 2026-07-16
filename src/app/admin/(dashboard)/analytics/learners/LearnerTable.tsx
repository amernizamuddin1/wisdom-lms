import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import SortableHeader from "@/components/analytics/SortableHeader";
import { formatHours } from "@/lib/analytics/format";
import { SEGMENT_LABELS, type EngagementSegment } from "@/lib/analytics/learner-segments";
import type { LearnerRow } from "@/lib/analytics/learners";

const PAGE_SIZE = 25;

const SEGMENT_BADGE_VARIANT: Record<EngagementSegment, "success" | "default" | "outline" | "destructive" | "secondary"> = {
  HIGHLY_ENGAGED: "success",
  ACTIVE: "default",
  SLOWING_DOWN: "outline",
  AT_RISK: "destructive",
  DORMANT: "secondary",
};

export default function LearnerTable({
  rows,
  total,
  page,
  q,
  sort,
  sortDir,
  otherParams,
}: {
  rows: LearnerRow[];
  total: number;
  page: number;
  q: string;
  sort: string;
  sortDir: "asc" | "desc";
  otherParams: Record<string, string | undefined>;
}) {
  const basePath = "/admin/analytics/learners";
  const linkParams = { ...otherParams, q: q || undefined };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">Learners</h3>
        <form method="get" className="flex items-center gap-2">
          {Object.entries(otherParams).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or email..."
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-64"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Learner" sortKey="name" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Enrolled" sortKey="coursesEnrolled" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Completed" sortKey="coursesCompleted" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Progress" sortKey="overallProgress" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Learning Time" sortKey="totalLearningTimeSeconds" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Avg Quiz" sortKey="averageQuizScore" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Last Active" sortKey="lastActiveAt" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3">
                <SortableHeader label="Streak" sortKey="currentStreak" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="XP" sortKey="xp" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.userId} className="hover:bg-muted/50">
                <td className="max-w-[220px] px-4 py-3">
                  <Link
                    href={`/admin/analytics/learners/${r.userId}`}
                    className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                    title={r.name}
                  >
                    {r.name}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground" title={r.email}>
                    {r.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.coursesEnrolled}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.coursesCompleted}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.overallProgress}%</td>
                <td className="px-4 py-3 text-muted-foreground">{formatHours(r.totalLearningTimeSeconds)}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.averageQuizScore ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.lastActiveAt ? r.lastActiveAt.toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={SEGMENT_BADGE_VARIANT[r.segment]}>{SEGMENT_LABELS[r.segment]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.currentStreak}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.xp.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  No learners match these filters.
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

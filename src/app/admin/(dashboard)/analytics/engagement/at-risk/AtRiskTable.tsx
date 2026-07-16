import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import SortableHeader from "@/components/analytics/SortableHeader";
import { formatHours } from "@/lib/analytics/format";
import type { AtRiskRow } from "@/lib/analytics/at-risk";

const PAGE_SIZE = 25;

export default function AtRiskTable({
  rows,
  total,
  page,
  q,
  sort,
  sortDir,
  otherParams,
}: {
  rows: AtRiskRow[];
  total: number;
  page: number;
  q: string;
  sort: string;
  sortDir: "asc" | "desc";
  otherParams: Record<string, string | undefined>;
}) {
  const basePath = "/admin/analytics/engagement/at-risk";
  const linkParams = { ...otherParams, q: q || undefined };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">At-Risk Learners</h3>
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
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Learner" sortKey="name" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3 font-medium">Incomplete Course(s)</th>
              <th className="px-4 py-3">
                <SortableHeader label="Progress" sortKey="currentProgress" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Last Activity" sortKey="lastMeaningfulActivityAt" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Days Inactive" sortKey="daysInactive" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3 font-medium">Previous Activity</th>
              <th className="px-4 py-3">
                <SortableHeader label="Streak" sortKey="currentStreak" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Learning Time" sortKey="totalLearningTimeSeconds" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3 font-medium">Risk Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.userId} className="hover:bg-muted/50">
                <td className="max-w-[200px] px-4 py-3">
                  <Link href={`/admin/analytics/learners/${r.userId}`} className="block truncate font-medium text-foreground hover:text-primary hover:underline" title={r.name}>
                    {r.name}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground" title={r.email}>
                    {r.email}
                  </div>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                  <span className="line-clamp-2" title={r.courses.join(", ")}>
                    {r.courses.join(", ") || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.currentProgress}%</td>
                <td className="px-4 py-3 text-muted-foreground">{r.lastMeaningfulActivityAt ? r.lastMeaningfulActivityAt.toLocaleDateString() : "Never"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.daysInactive ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.previousActivityLevel}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.currentStreak}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatHours(r.totalLearningTimeSeconds)}</td>
                <td className="max-w-[240px] px-4 py-3">
                  <Badge variant="destructive" className="whitespace-normal text-left">
                    {r.riskReason}
                  </Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No at-risk learners match these filters.
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

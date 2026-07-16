import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import SortableHeader from "@/components/analytics/SortableHeader";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import { COMMERCE_METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import { formatCurrency } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";
import type { BundlePerformanceRow } from "@/lib/analytics/commerce-bundles";

const PAGE_SIZE = 10;

export default function BundlePerformanceTable({
  rows,
  total,
  page,
  sort,
  sortDir,
  selectedBundleId,
  otherParams,
}: {
  rows: BundlePerformanceRow[];
  total: number;
  page: number;
  sort: string;
  sortDir: "asc" | "desc";
  selectedBundleId: string | null;
  otherParams: Record<string, string | undefined>;
}) {
  const basePath = "/admin/analytics/commerce/bundles";

  function bundleHref(bundleId: string) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(otherParams)) if (v) search.set(k, v);
    search.set("sort", sort);
    search.set("sortDir", sortDir);
    search.set("page", String(page));
    search.set("bundleId", bundleId);
    return `${basePath}?${search.toString()}`;
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold text-foreground">Bundle Performance</h3>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Name" sortKey="name" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Sales" sortKey="sales" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Revenue" sortKey="revenue" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Conversion Rate" sortKey="conversionRate" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="ASP" sortKey="averageSellingPrice" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="Bundle Utilization" sortKey="bundleUtilization" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
                  <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.bundleUtilization} />
                </div>
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Started After Purchase" sortKey="coursesStartedAfterPurchase" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Completed After Purchase" sortKey="coursesCompletedAfterPurchase" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr
                key={r.bundleId}
                className={cn("hover:bg-muted/50", selectedBundleId === r.bundleId && "bg-surface-brand-subtle")}
              >
                <td className="max-w-[240px] px-4 py-3">
                  <Link
                    href={bundleHref(r.bundleId)}
                    className="line-clamp-2 font-medium text-foreground hover:text-primary hover:underline"
                    title={r.name}
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.sales.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.revenue, r.currencyLabel)}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.conversionRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.averageSellingPrice, r.currencyLabel)}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.bundleUtilization}%</td>
                <td className="px-4 py-3 text-muted-foreground">{r.coursesStartedAfterPurchase.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.coursesCompletedAfterPurchase.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No bundles match these filters.
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
          for (const [k, v] of Object.entries(otherParams)) if (v) search.set(k, v);
          search.set("sort", sort);
          search.set("sortDir", sortDir);
          search.set("page", String(p));
          return `${basePath}?${search.toString()}`;
        }}
      />
    </div>
  );
}

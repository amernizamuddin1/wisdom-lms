import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import SortableHeader from "@/components/analytics/SortableHeader";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import { COMMERCE_METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import { formatCurrency } from "@/lib/analytics/format";
import type { ProductPerformanceRow } from "@/lib/analytics/commerce-products";

const PAGE_SIZE = 10;

export default function ProductPerformanceTable({
  rows,
  total,
  page,
  q,
  sort,
  sortDir,
  otherParams,
}: {
  rows: ProductPerformanceRow[];
  total: number;
  page: number;
  q: string;
  sort: string;
  sortDir: "asc" | "desc";
  otherParams: Record<string, string | undefined>;
}) {
  const basePath = "/admin/analytics/commerce/products";
  const linkParams = { ...otherParams, q: q || undefined };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">Product Performance</h3>
        <form method="get" className="flex items-center gap-2">
          {Object.entries(otherParams).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products..."
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-56"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1500px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Title" sortKey="title" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Views" sortKey="views" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Enrollments" sortKey="enrollments" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Paid Orders" sortKey="paidOrders" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Free Enrollments" sortKey="freeEnrollments" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="Conversion Rate" sortKey="conversionRate" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
                  <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.productConversionRate} />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="Gross Revenue" sortKey="grossRevenue" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
                  <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.grossRevenue} />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="Net Revenue" sortKey="netRevenue" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
                  <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.netRevenue} />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="ASP" sortKey="averageSellingPrice" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
                  <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.averageSellingPrice} />
                </div>
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Discounts" sortKey="discounts" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Refunds" sortKey="refunds" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Completion Rate" sortKey="completionRate" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Engagement Rate" sortKey="engagementRate" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <SortableHeader label="Revenue/Learner" sortKey="revenuePerLearner" currentSort={sort} currentDir={sortDir} basePath={basePath} params={linkParams} />
                  <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.revenuePerLearner} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/50">
                <td className="max-w-[260px] px-4 py-3">
                  <div className="line-clamp-2 font-medium text-foreground" title={r.title}>
                    {r.title}
                  </div>
                  <div className="mt-1">
                    <Badge variant="outline">{r.itemType === "COURSE" ? "Course" : "Bundle"}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.views.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.enrollments.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.paidOrders.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.freeEnrollments.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.conversionRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.grossRevenue, r.currencyLabel)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.netRevenue, r.currencyLabel)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.averageSellingPrice, r.currencyLabel)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.discounts, r.currencyLabel)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.refunds, r.currencyLabel)}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.completionRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{r.engagementRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.revenuePerLearner, r.currencyLabel)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-muted-foreground">
                  No products match these filters.
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

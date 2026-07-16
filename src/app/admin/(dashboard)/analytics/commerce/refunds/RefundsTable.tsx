import { Pagination } from "@/components/ui/pagination";
import SortableHeader from "@/components/analytics/SortableHeader";
import type { RefundRow } from "@/lib/analytics/commerce-refunds";

const PAGE_SIZE = 10;

export default function RefundsTable({
  rows,
  total,
  page,
  sort,
  sortDir,
  otherParams,
}: {
  rows: RefundRow[];
  total: number;
  page: number;
  sort: string;
  sortDir: "asc" | "desc";
  otherParams: Record<string, string | undefined>;
}) {
  const basePath = "/admin/analytics/commerce/refunds";

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold text-foreground">Refunds</h3>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Order #" sortKey="orderNumber" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3">
                <SortableHeader label="Amount" sortKey="amount" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3">
                <SortableHeader label="Days to Refund" sortKey="daysToRefund" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Refunded At" sortKey="refundedAt" currentSort={sort} currentDir={sortDir} basePath={basePath} params={otherParams} />
              </th>
              <th className="px-4 py-3 font-medium">Issued By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.orderId} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{r.orderNumber}</td>
                <td className="max-w-[260px] px-4 py-3">
                  <div className="line-clamp-2 text-muted-foreground" title={r.itemTitles}>
                    {r.itemTitles}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">₹{r.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.reason ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.daysToRefund ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.refundedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.issuedByName}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No refunds in this range.
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

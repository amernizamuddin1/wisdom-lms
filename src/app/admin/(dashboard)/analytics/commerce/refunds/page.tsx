import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getRefundMetrics, type RefundRow } from "@/lib/analytics/commerce-refunds";
import { COMMERCE_METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import RefundsTable from "./RefundsTable";
import { exportRefundRowsCsv } from "./actions";
import { RotateCcwIcon, BanknoteIcon, PercentIcon, ClockIcon } from "lucide-react";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  sort?: string;
  sortDir?: string;
};

function sortRows(rows: RefundRow[], sort: string, dir: "asc" | "desc"): RefundRow[] {
  const key = sort as keyof RefundRow;
  const factor = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * factor;
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * factor;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    if (av === null) return 1;
    if (bv === null) return -1;
    return 0;
  });
}

const PAGE_SIZE = 10;

export default async function RefundAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const sort = params.sort ?? "refundedAt";
  const sortDir: "asc" | "desc" = params.sortDir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page) || 1);

  const result = await getRefundMetrics(range);
  const { refundCount, totalRefundAmount, refundRate, averageDaysToRefund, reasonBreakdown, learnerProgressAtRefund } =
    result;

  const sortedRows = sortRows(result.rows, sort, sortDir);
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const otherParams = { range: params.range, from: params.from, to: params.to };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Refund Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Refund volume, timing, and reasons across paid orders in the selected range.
          </p>
        </div>
        <DownloadCsvButton
          action={exportRefundRowsCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
          })}
          filenamePrefix="refunds"
        />
      </div>

      <AnalyticsFilterBar />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Refund Count" value={refundCount.toLocaleString()} icon={RotateCcwIcon} />
        <KpiCard label="Total Refund Amount" value={`₹${totalRefundAmount.toLocaleString()}`} icon={BanknoteIcon} />
        <KpiCard
          label="Refund Rate"
          value={`${refundRate}%`}
          icon={PercentIcon}
          tooltip="Total refund amount as a share of gross paid revenue in the selected date range."
        />
        <KpiCard
          label="Avg. Days to Refund"
          value={averageDaysToRefund === null ? "—" : `${averageDaysToRefund}d`}
          icon={ClockIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.daysToRefund}
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-foreground">Reason Breakdown</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Count</th>
                <th className="px-4 py-3 font-medium">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reasonBreakdown.map((r) => (
                <tr key={r.reason} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{r.reason}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">₹{r.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
              {reasonBreakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No refunds in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RefundsTable rows={pageRows} total={sortedRows.length} page={page} sort={sort} sortDir={sortDir} otherParams={otherParams} />

      {learnerProgressAtRefund.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div>
            <h3 className="font-semibold text-foreground">Learner Progress at Refund</h3>
            <p className="text-xs text-muted-foreground">
              Current course progress for refunded learners — reflects progress as of now, not a snapshot taken at
              the moment of refund.
            </p>
          </div>
          <ul className="divide-y divide-border text-sm">
            {learnerProgressAtRefund.map((entry) => (
              <li key={entry.refundId} className="space-y-1 py-2">
                <p className="text-xs text-muted-foreground">Learner {entry.userId}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {entry.courseProgress.map((cp) => (
                    <span key={cp.courseId} className="text-foreground">
                      {cp.title}: <span className="text-muted-foreground">{cp.progressPercent}%</span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

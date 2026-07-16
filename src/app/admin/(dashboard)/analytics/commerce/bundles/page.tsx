import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getBundlePerformance, type BundlePerformanceRow } from "@/lib/analytics/commerce-bundles";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import BundlePerformanceTable from "./BundlePerformanceTable";
import BundleComparisonTable from "./BundleComparisonTable";
import { exportBundlePerformanceCsv } from "./actions";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  sort?: string;
  sortDir?: string;
  bundleId?: string;
};

function sortRows(rows: BundlePerformanceRow[], sort: string, dir: "asc" | "desc"): BundlePerformanceRow[] {
  const key = sort as keyof BundlePerformanceRow;
  const factor = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * factor;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return 0;
  });
}

const PAGE_SIZE = 10;

export default async function BundleAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const sort = params.sort ?? "revenue";
  const sortDir: "asc" | "desc" = params.sortDir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page) || 1);

  const bundleRows = await getBundlePerformance(range);
  const sortedRows = sortRows(bundleRows, sort, sortDir);
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const requestedBundleId = params.bundleId && params.bundleId !== "all" ? params.bundleId : null;
  const selectedBundle =
    (requestedBundleId && sortedRows.find((b) => b.bundleId === requestedBundleId)) || sortedRows[0] || null;

  const otherParams = { range: params.range, from: params.from, to: params.to };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bundle Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Per-bundle sales, utilization, and how bundled courses get started compared to standalone purchases.
          </p>
        </div>
        <DownloadCsvButton
          action={exportBundlePerformanceCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
          })}
          filenamePrefix="bundle-performance"
        />
      </div>

      <AnalyticsFilterBar />

      <BundlePerformanceTable
        rows={pageRows}
        total={sortedRows.length}
        page={page}
        sort={sort}
        sortDir={sortDir}
        selectedBundleId={selectedBundle?.bundleId ?? null}
        otherParams={otherParams}
      />

      {selectedBundle ? (
        <BundleComparisonTable bundleName={selectedBundle.name} rows={selectedBundle.bundleVsStandaloneComparison} />
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Select a bundle above to see its bundle-vs-standalone comparison.
        </div>
      )}
    </div>
  );
}

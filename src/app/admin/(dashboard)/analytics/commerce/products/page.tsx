import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getProductPerformance, type ProductPerformanceRow } from "@/lib/analytics/commerce-products";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import ProductPerformanceTable from "./ProductPerformanceTable";
import { exportProductPerformanceCsv } from "./actions";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  page?: string;
  sort?: string;
  sortDir?: string;
  q?: string;
};

function sortRows(rows: ProductPerformanceRow[], sort: string, dir: "asc" | "desc"): ProductPerformanceRow[] {
  const key = sort as keyof ProductPerformanceRow;
  const factor = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * factor;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    if (av === null) return 1;
    if (bv === null) return -1;
    return 0;
  });
}

const PAGE_SIZE = 10;

export default async function CommerceProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const sort = params.sort ?? "grossRevenue";
  const sortDir: "asc" | "desc" = params.sortDir === "asc" ? "asc" : "desc";
  const q = params.q ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const [courses, matchedRows] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    getProductPerformance(range, q || undefined),
  ]);

  // Product catalog (courses + bundles) is small and bounded, not
  // learner-count-scaled, so sorting/paginating in JS mirrors the Phase 1
  // overview page's CoursePerformanceTable convention (see PAGE_SIZE note
  // there).
  const sortedRows = sortRows(matchedRows, sort, sortDir);
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const otherParams = { range: params.range, from: params.from, to: params.to };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Product Performance</h1>
          <p className="text-sm text-muted-foreground">
            Per-course and per-bundle views, conversion, revenue, and engagement in the selected date range.
          </p>
        </div>
        <DownloadCsvButton
          action={exportProductPerformanceCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
            q: params.q,
          })}
          filenamePrefix="product-performance"
        />
      </div>

      <AnalyticsFilterBar courses={courses} />

      <ProductPerformanceTable
        rows={pageRows}
        total={sortedRows.length}
        page={page}
        q={q}
        sort={sort}
        sortDir={sortDir}
        otherParams={otherParams}
      />
    </div>
  );
}

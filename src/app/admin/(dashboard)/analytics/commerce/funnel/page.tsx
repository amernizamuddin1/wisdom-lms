import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getCommercialFunnel } from "@/lib/analytics/commerce-funnel";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import CommercialFunnelChart from "./CommercialFunnelChart";
import { exportCommercialFunnelCsv } from "./actions";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  bundleId?: string;
};

export default async function CommercialFunnelPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const bundleId = params.bundleId && params.bundleId !== "all" ? params.bundleId : null;

  const [courses, bundles, funnel] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.courseBundle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getCommercialFunnel(range, { courseId, bundleId }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Commercial Funnel</h1>
          <p className="text-sm text-muted-foreground">
            From product view to completed payment, in the selected date range.
          </p>
        </div>
        <DownloadCsvButton
          action={exportCommercialFunnelCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
            courseId: params.courseId,
            bundleId: params.bundleId,
          })}
          filenamePrefix="commercial-funnel"
        />
      </div>

      <AnalyticsFilterBar courses={courses} bundles={bundles} />

      <CommercialFunnelChart stages={funnel.stages} />
    </div>
  );
}

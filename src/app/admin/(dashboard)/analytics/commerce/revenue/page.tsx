import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getRevenueTrend, type RevenueGranularity } from "@/lib/analytics/commerce-revenue";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RevenueTrendChart from "../RevenueTrendChart";
import RevenueControls from "./RevenueControls";
import { exportRevenueTrendCsv } from "./actions";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  bundleId?: string;
  granularity?: string;
  paymentStatus?: string;
  discountedOnly?: string;
};

type PaymentStatusFilter = "all" | "PAID" | "FAILED" | "PENDING";

function resolveGranularity(value?: string): RevenueGranularity {
  return value === "week" || value === "month" ? value : "day";
}

function resolvePaymentStatusFilter(value?: string): PaymentStatusFilter {
  return value === "PAID" || value === "FAILED" || value === "PENDING" ? value : "all";
}

export default async function RevenueTrendsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const bundleId = params.bundleId && params.bundleId !== "all" ? params.bundleId : null;
  const granularity = resolveGranularity(params.granularity);
  const paymentStatusFilter = resolvePaymentStatusFilter(params.paymentStatus);
  const paymentStatus = paymentStatusFilter === "all" ? null : paymentStatusFilter;
  const discountedOnly = params.discountedOnly === "true";

  const [trend, courses, bundles] = await Promise.all([
    getRevenueTrend(range, granularity, { courseId, bundleId, paymentStatus, discountedOnly }),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.courseBundle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Revenue Trends</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, refunds, and discounts over time, filterable by product and payment outcome.
          </p>
        </div>
        <DownloadCsvButton
          action={exportRevenueTrendCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
            courseId: params.courseId,
            bundleId: params.bundleId,
            granularity: params.granularity,
            paymentStatus: params.paymentStatus,
            discountedOnly: params.discountedOnly,
          })}
          filenamePrefix="revenue-trend"
        />
      </div>

      <AnalyticsFilterBar courses={courses} bundles={bundles} />

      <RevenueControls granularity={granularity} paymentStatus={paymentStatusFilter} discountedOnly={discountedOnly} />

      <RevenueTrendChart points={trend.points} granularity={trend.granularity} />

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Period</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.points.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No data for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Revenue</th>
                    <th className="py-2 pr-4 font-medium">Refunds</th>
                    <th className="py-2 pr-4 font-medium">Discounts</th>
                    <th className="py-2 pr-4 font-medium">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.points.map((p) => (
                    <tr key={p.date} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 text-foreground">{p.date}</td>
                      <td className="py-2 pr-4 text-foreground">₹{p.revenue.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-foreground">₹{p.refunds.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-foreground">₹{p.discounts.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-foreground">{p.transactions.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getCommerceKpis } from "@/lib/analytics/commerce-overview";
import { getRevenueTrend } from "@/lib/analytics/commerce-revenue";
import { getCommercialFunnel } from "@/lib/analytics/commerce-funnel";
import { getRepeatPurchaseMetrics } from "@/lib/analytics/commerce-repeat-purchase";
import { getCommercialInsights } from "@/lib/analytics/commerce-insights";
import { COMMERCE_METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import RevenueTrendChart from "./RevenueTrendChart";
import CommercialFunnelSummary from "./CommercialFunnelSummary";
import InsightsPanel from "./InsightsPanel";
import { exportCommerceKpisCsv } from "./actions";
import {
  BanknoteIcon,
  WalletIcon,
  ReceiptIcon,
  UsersIcon,
  CalculatorIcon,
  TrendingUpIcon,
  RotateCcwIcon,
  TagIcon,
  CheckCircle2Icon,
} from "lucide-react";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
};

function money(value: number): string {
  return `₹${(Math.round(value * 100) / 100).toLocaleString()}`;
}

export default async function CommerceOverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;

  const [kpis, trend, funnel, repeatPurchase, insights, courses] = await Promise.all([
    getCommerceKpis(range),
    getRevenueTrend(range, "day"),
    getCommercialFunnel(range, { courseId }),
    getRepeatPurchaseMetrics(range),
    getCommercialInsights(range),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Commercial Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, orders, and commercial funnel health at a glance.
          </p>
        </div>
        <DownloadCsvButton
          action={exportCommerceKpisCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
            courseId: params.courseId,
          })}
          filenamePrefix="commerce-kpis"
        />
      </div>

      <AnalyticsFilterBar courses={courses} />

      <InsightsPanel insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Gross Revenue"
          value={money(kpis.grossRevenue.value)}
          changePercent={kpis.grossRevenue.changePercent}
          icon={BanknoteIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.grossRevenue}
        />
        <KpiCard
          label="Net Revenue"
          value={money(kpis.netRevenue.value)}
          changePercent={kpis.netRevenue.changePercent}
          icon={WalletIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.netRevenue}
        />
        <KpiCard
          label="Transactions"
          value={kpis.transactions.value.toLocaleString()}
          changePercent={kpis.transactions.changePercent}
          icon={ReceiptIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.transactions}
        />
        <KpiCard
          label="Paying Learners"
          value={kpis.payingLearners.value.toLocaleString()}
          changePercent={kpis.payingLearners.changePercent}
          icon={UsersIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.payingLearners}
        />
        <KpiCard
          label="Average Order Value"
          value={money(kpis.averageOrderValue.value)}
          changePercent={kpis.averageOrderValue.changePercent}
          icon={CalculatorIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.averageOrderValue}
        />
        <KpiCard
          label="Revenue Per Learner"
          value={money(kpis.revenuePerLearner.value)}
          changePercent={kpis.revenuePerLearner.changePercent}
          icon={TrendingUpIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.revenuePerLearner}
        />
        <KpiCard
          label="Refund Amount"
          value={money(kpis.refundAmount.value)}
          changePercent={kpis.refundAmount.changePercent}
          icon={RotateCcwIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.refundAmount}
        />
        <KpiCard
          label="Discount Value Given"
          value={money(kpis.discountValueGiven.value)}
          changePercent={kpis.discountValueGiven.changePercent}
          icon={TagIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.discountValueGiven}
        />
        <KpiCard
          label="Payment Success Rate"
          value={`${kpis.paymentSuccessRate.value}%`}
          changePercent={kpis.paymentSuccessRate.changePercent}
          icon={CheckCircle2Icon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.paymentSuccessRate}
        />
      </div>

      <RevenueTrendChart points={trend.points} granularity={trend.granularity} />

      <CommercialFunnelSummary stages={funnel.stages} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="First-Time Buyers" value={repeatPurchase.firstTimeBuyers.toLocaleString()} />
        <KpiCard label="Repeat Buyers" value={repeatPurchase.repeatBuyers.toLocaleString()} />
        <KpiCard
          label="Repeat Purchase Rate"
          value={`${repeatPurchase.repeatPurchaseRate}%`}
          tooltip={COMMERCE_METRIC_TOOLTIPS.repeatPurchaseRate}
        />
        <KpiCard
          label="Free-to-Paid Conversion Rate"
          value={`${repeatPurchase.freeToPaidConversionRate}%`}
          tooltip={COMMERCE_METRIC_TOOLTIPS.freeToPaidConversionRate}
        />
      </div>
    </div>
  );
}

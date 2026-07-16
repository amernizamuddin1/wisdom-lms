import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getPaymentHealth } from "@/lib/analytics/commerce-payments";
import { COMMERCE_METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FailedPaymentsTable from "./FailedPaymentsTable";
import { exportFailedPaymentsCsv } from "./actions";
import { CheckCircle2Icon, XCircleIcon, ClockIcon, PercentIcon, AlertTriangleIcon } from "lucide-react";

type SearchParams = { range?: string; from?: string; to?: string };

const GATEWAY_LABELS: Record<string, string> = {
  RAZORPAY: "Razorpay",
  STRIPE: "Stripe",
  FREE: "Free",
};

export default async function PaymentAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);

  const health = await getPaymentHealth(range);
  const { statusCounts, gatewayCounts, averageTimeToPayMinutes, abandonedPendingCount, failedPayments } = health;

  const totalAttempts = statusCounts.completed + statusCounts.failed + statusCounts.pending;
  const successRate = totalAttempts === 0 ? 0 : Math.round((statusCounts.completed / totalAttempts) * 1000) / 10;

  const maxGatewayCount = Math.max(1, ...gatewayCounts.map((g) => g.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Payment Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Payment attempt outcomes, gateway mix, and failed payments in the selected date range.
          </p>
        </div>
        <DownloadCsvButton
          action={exportFailedPaymentsCsv.bind(null, { range: params.range, from: params.from, to: params.to })}
          filenamePrefix="failed-payments"
        />
      </div>

      <AnalyticsFilterBar />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Completed" value={statusCounts.completed.toLocaleString()} icon={CheckCircle2Icon} />
        <KpiCard label="Failed" value={statusCounts.failed.toLocaleString()} icon={XCircleIcon} />
        <KpiCard label="Pending" value={statusCounts.pending.toLocaleString()} icon={ClockIcon} />
        <KpiCard
          label="Payment Success Rate"
          value={`${successRate}%`}
          icon={PercentIcon}
          tooltip={COMMERCE_METRIC_TOOLTIPS.paymentSuccessRate}
        />
        <KpiCard
          label="Avg. Time to Pay"
          value={averageTimeToPayMinutes === null ? "—" : `${Math.round(averageTimeToPayMinutes)} min`}
          icon={ClockIcon}
        />
        <KpiCard
          label="Abandoned / Pending (24h+)"
          value={abandonedPendingCount.toLocaleString()}
          icon={AlertTriangleIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gateway Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {gatewayCounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payment attempts in this range.</p>
          ) : (
            <div className="space-y-3">
              {gatewayCounts.map((g) => {
                const widthPercent = Math.max(4, Math.round((g.count / maxGatewayCount) * 100));
                return (
                  <div key={g.gateway} className="px-1 py-1">
                    <div className="flex items-center justify-between py-1 text-sm">
                      <span className="font-medium text-foreground">{GATEWAY_LABELS[g.gateway] ?? g.gateway}</span>
                      <span className="text-muted-foreground">{g.count.toLocaleString()}</span>
                    </div>
                    <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                      <div className="h-full rounded-md bg-primary/80 transition-all" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FailedPaymentsTable rows={failedPayments} />
    </div>
  );
}

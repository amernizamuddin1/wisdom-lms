import { requireAdmin } from "@/lib/auth";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getDiscountPerformance } from "@/lib/analytics/commerce-discounts";
import { formatCurrency } from "@/lib/analytics/format";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import { Badge } from "@/components/ui/badge";
import { exportDiscountWindowsCsv } from "./actions";
import { TagIcon, TimerIcon } from "lucide-react";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
};

export default async function DiscountAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);

  const result = await getDiscountPerformance(range);
  const { couponUsage, discountWindows, discountValuePerUnit, discountsNearingExpiry } = result;

  const sortedNearingExpiry = [...discountsNearingExpiry].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Discount Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Coupon-code usage, automatic sale-price windows, and upcoming discount expirations.
          </p>
        </div>
        <DownloadCsvButton
          action={exportDiscountWindowsCsv.bind(null, {
            range: params.range,
            from: params.from,
            to: params.to,
          })}
          filenamePrefix="discount-windows"
        />
      </div>

      <AnalyticsFilterBar />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Discount Value Per Unit"
          value={discountValuePerUnit > 0 ? `₹${discountValuePerUnit.toLocaleString()}` : "—"}
          icon={TagIcon}
          tooltip="Total discount value (sale-price + coupon) in the selected range, divided by the number of discounted units sold."
        />
        <KpiCard
          label="Discounts Nearing Expiry"
          value={discountsNearingExpiry.length.toLocaleString()}
          icon={TimerIcon}
          tooltip="Courses and bundles whose active discount window ends within the configured alert window."
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-foreground">Coupon Usage</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Redemptions</th>
                <th className="px-4 py-3 font-medium">Total Discount</th>
                <th className="px-4 py-3 font-medium">Order Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {couponUsage.map((r) => (
                <tr key={r.couponId} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{r.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.redemptions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">₹{r.totalDiscountAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">₹{r.totalOrderRevenue.toLocaleString()}</td>
                </tr>
              ))}
              {couponUsage.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No coupon redemptions in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <h3 className="font-semibold text-foreground">Discount Windows</h3>
          <p className="text-xs text-muted-foreground">
            Before/during comparison only — not a causal claim; many other factors can influence order volume across
            these two windows.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Regular Price</th>
                <th className="px-4 py-3 font-medium">ASP During Discount</th>
                <th className="px-4 py-3 font-medium">Units Sold</th>
                <th className="px-4 py-3 font-medium">Orders Before (30d)</th>
                <th className="px-4 py-3 font-medium">Orders During</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {discountWindows.map((r) => (
                <tr key={`${r.itemType}-${r.id}`} className="hover:bg-muted/50">
                  <td className="max-w-[220px] px-4 py-3">
                    <div className="line-clamp-2 font-medium text-foreground" title={r.title}>
                      {r.title}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{r.itemType === "COURSE" ? "Course" : "Bundle"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCurrency(r.regularPrice, r.currency)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCurrency(r.averageSellingPriceDuringDiscount, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.unitsSoldDuringDiscount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.ordersInPrior30Days.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.ordersDuringDiscountWindow.toLocaleString()}</td>
                </tr>
              ))}
              {discountWindows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No discount windows overlap this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-foreground">Discounts Nearing Expiry</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Days Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedNearingExpiry.map((r) => (
                <tr key={`${r.itemType}-${r.id}`} className="hover:bg-muted/50">
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="line-clamp-2 font-medium text-foreground" title={r.title}>
                      {r.title}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{r.itemType === "COURSE" ? "Course" : "Bundle"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.daysRemaining}</td>
                </tr>
              ))}
              {sortedNearingExpiry.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No discounts are nearing expiry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

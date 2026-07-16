import "server-only";
import type { ResolvedRange } from "./date-range";
import type { Insight } from "./insights";
import { prisma } from "@/lib/prisma";
import {
  MIN_PAYMENT_SAMPLE_SIZE,
  REVENUE_DECLINE_ALERT_PERCENT,
  PAYMENT_FAILURE_RATE_INCREASE_ALERT_POINTS,
  HIGH_REFUND_RATE_ALERT_PERCENT,
  MIN_REFUND_SAMPLE_ORDERS,
  LOW_BUNDLE_UTILIZATION_ALERT_PERCENT,
} from "./definitions";
import { getCommerceKpis } from "./commerce-overview";
import { getPaymentHealth } from "./commerce-payments";
import { getRefundMetrics } from "./commerce-refunds";
import { getProductPerformance } from "./commerce-products";
import { getBundlePerformance } from "./commerce-bundles";
import { getDiscountPerformance } from "./commerce-discounts";

export type { Insight };

// Same plain-arithmetic, no-AI, association-not-causation convention as
// insights.ts (Phase 2) — every rule below is independently gated by a
// minimum-sample check, worded as an observation, and the final list is
// capped to 5 so the panel stays scannable even when several rules fire.
export async function getCommercialInsights(range: ResolvedRange): Promise<Insight[]> {
  const insights: Insight[] = [];
  const previousRange: ResolvedRange = {
    key: range.key,
    from: range.previousFrom,
    to: range.previousTo,
    previousFrom: range.previousFrom,
    previousTo: range.previousTo,
  };

  const [kpis, paymentHealth, previousPaymentHealth, previousGrossAgg, refundMetrics, productPerformance, bundlePerformance, discountPerformance] =
    await Promise.all([
      getCommerceKpis(range),
      getPaymentHealth(range),
      getPaymentHealth(previousRange),
      prisma.order.aggregate({
        where: { status: "PAID", paidAt: { gte: range.previousFrom, lte: range.previousTo } },
        _sum: { totalAmount: true },
      }),
      getRefundMetrics(range),
      getProductPerformance(range),
      getBundlePerformance(range),
      getDiscountPerformance(range),
    ]);

  // 1. Revenue decline — gated on the previous period actually having
  // revenue, so a brand-new product line (previous = 0) never reads as a
  // "decline" off a zero base.
  const previousGrossRevenue = Number(previousGrossAgg._sum.totalAmount ?? 0);
  if (previousGrossRevenue > 0 && kpis.grossRevenue.changePercent !== null && kpis.grossRevenue.changePercent <= REVENUE_DECLINE_ALERT_PERCENT) {
    insights.push({
      id: "revenue-decline",
      text: `Gross revenue is down ${Math.abs(kpis.grossRevenue.changePercent)}% versus the previous period, a decline associated with this window rather than a single identified cause.`,
    });
  }

  // 2. Increased payment failures — gated on enough current-period payment
  // attempts to make a failure-rate comparison meaningful.
  const currentAttempts = paymentHealth.statusCounts.completed + paymentHealth.statusCounts.failed + paymentHealth.statusCounts.pending;
  const previousAttempts =
    previousPaymentHealth.statusCounts.completed + previousPaymentHealth.statusCounts.failed + previousPaymentHealth.statusCounts.pending;
  if (currentAttempts >= MIN_PAYMENT_SAMPLE_SIZE) {
    const currentFailureRate = currentAttempts === 0 ? 0 : (paymentHealth.statusCounts.failed / currentAttempts) * 100;
    const previousFailureRate = previousAttempts === 0 ? 0 : (previousPaymentHealth.statusCounts.failed / previousAttempts) * 100;
    const delta = Math.round((currentFailureRate - previousFailureRate) * 10) / 10;
    if (delta >= PAYMENT_FAILURE_RATE_INCREASE_ALERT_POINTS) {
      insights.push({
        id: "payment-failure-increase",
        text: `Payment failure rate rose ${delta} percentage points versus the previous period (${Math.round(currentFailureRate * 10) / 10}% of ${currentAttempts} attempts this period), an association worth investigating with the payment gateway.`,
      });
    }
  }

  // 3. High refund rate — gated on enough paid orders in range for the rate
  // to not be one refund on a handful of sales.
  if (kpis.transactions.value >= MIN_REFUND_SAMPLE_ORDERS && refundMetrics.refundRate >= HIGH_REFUND_RATE_ALERT_PERCENT) {
    insights.push({
      id: "high-refund-rate",
      text: `Refunds equal ${refundMetrics.refundRate}% of gross paid revenue this period (${refundMetrics.refundCount} refunds against ${kpis.transactions.value} paid orders), above the ${HIGH_REFUND_RATE_ALERT_PERCENT}% watch threshold.`,
    });
  }

  // 4. High-revenue, low-completion course — the course driving the most
  // revenue whose completion rate sits below the catalog median, gated on
  // having at least two courses to compute a meaningful median from.
  const courseRows = productPerformance.filter((p) => p.itemType === "COURSE");
  if (courseRows.length >= 2) {
    const sortedCompletionRates = [...courseRows.map((c) => c.completionRate)].sort((a, b) => a - b);
    const mid = Math.floor(sortedCompletionRates.length / 2);
    const medianCompletionRate =
      sortedCompletionRates.length % 2 === 0
        ? (sortedCompletionRates[mid - 1] + sortedCompletionRates[mid]) / 2
        : sortedCompletionRates[mid];

    const topRevenueCourse = courseRows.reduce((best, c) => (c.grossRevenue > best.grossRevenue ? c : best), courseRows[0]);
    if (topRevenueCourse.grossRevenue > 0 && topRevenueCourse.completionRate < medianCompletionRate) {
      insights.push({
        id: "high-revenue-low-completion",
        text: `"${topRevenueCourse.title}" is the top revenue-generating course this period but has a ${topRevenueCourse.completionRate}% completion rate, below the ${Math.round(medianCompletionRate * 10) / 10}% catalog median.`,
      });
    }
  }

  // 5. Low bundle utilization — the least-utilized bundle below the
  // low-utilization threshold, if any bundle qualifies.
  const underutilizedBundles = bundlePerformance.filter((b) => b.bundleUtilization < LOW_BUNDLE_UTILIZATION_ALERT_PERCENT);
  if (underutilizedBundles.length > 0) {
    const lowest = underutilizedBundles.reduce((worst, b) => (b.bundleUtilization < worst.bundleUtilization ? b : worst), underutilizedBundles[0]);
    insights.push({
      id: "low-bundle-utilization",
      text: `"${lowest.name}" has ${lowest.bundleUtilization}% average member-course utilization among its holders, below the ${LOW_BUNDLE_UTILIZATION_ALERT_PERCENT}% threshold.`,
    });
  }

  // 6. Discounts nearing expiry — reuses commerce-discounts' own
  // near-expiry window definition rather than redefining "soon" here.
  if (discountPerformance.discountsNearingExpiry.length > 0) {
    const soonest = [...discountPerformance.discountsNearingExpiry].sort(
      (a, b) => a.discountEndAt.getTime() - b.discountEndAt.getTime(),
    )[0];
    insights.push({
      id: "discounts-nearing-expiry",
      text: `${discountPerformance.discountsNearingExpiry.length} discount${discountPerformance.discountsNearingExpiry.length === 1 ? "" : "s"} nearing expiry, soonest being "${soonest.title}".`,
    });
  }

  return insights.slice(0, 5);
}

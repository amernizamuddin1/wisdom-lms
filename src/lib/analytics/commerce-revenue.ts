import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { dateKey } from "./date-range";
import { ANALYTICS_ROW_CAP } from "./shared";
import { getPaidOrderItems, sumItemDiscounts, sumCouponDiscounts } from "./commerce-shared";

export type RevenueGranularity = "day" | "week" | "month";

export type RevenueTrendFilters = {
  courseId?: string | null;
  bundleId?: string | null;
  paymentStatus?: "PAID" | "FAILED" | "PENDING" | null;
  discountedOnly?: boolean;
};

export type RevenueTrendPoint = {
  date: string;
  revenue: number;
  refunds: number;
  discounts: number;
  transactions: number;
};

export type RevenueTrendResult = {
  granularity: RevenueGranularity;
  points: RevenueTrendPoint[];
};

// ISO 8601 week key (YYYY-Www) — used instead of a plain "week starting"
// date so week buckets are stable regardless of which weekday the range
// happens to start on.
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function bucketKeyFor(d: Date, granularity: RevenueGranularity): string {
  if (granularity === "day") return dateKey(d);
  if (granularity === "week") return isoWeekKey(d);
  return monthKey(d);
}

// Walks day-by-day across [from, to] to produce the ordered, deduplicated
// list of bucket keys the range spans — this is what lets a bucket with zero
// matching rows still render as a zero point instead of silently vanishing.
function orderedBucketKeys(from: Date, to: Date, granularity: RevenueGranularity): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = bucketKeyFor(cursor, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

type Accumulator = { revenue: number; refunds: number; discounts: number; transactions: number };

function emptyAccumulator(): Accumulator {
  return { revenue: 0, refunds: 0, discounts: 0, transactions: 0 };
}

// Builds the paid-order-path series (default / paymentStatus = "PAID"). When
// a courseId/bundleId filter is set, revenue is product-scoped and summed
// from OrderItem.finalPrice (via commerce-shared's canonical join, matching
// courses.ts's per-course revenue convention) since Order.totalAmount would
// overstate a single product's revenue whenever the order also contains
// other items. With no product filter, revenue is order-level
// Order.totalAmount, matching the overview KPI's top-line definition.
async function buildPaidSeries(
  range: ResolvedRange,
  granularity: RevenueGranularity,
  filters: RevenueTrendFilters,
): Promise<Map<string, Accumulator>> {
  const buckets = new Map<string, Accumulator>();
  const bump = (key: string) => {
    const acc = buckets.get(key) ?? emptyAccumulator();
    buckets.set(key, acc);
    return acc;
  };

  if (filters.courseId || filters.bundleId) {
    const items = await getPaidOrderItems(range, { courseId: filters.courseId, bundleId: filters.bundleId });
    const filtered = filters.discountedOnly
      ? items.filter((i) => i.finalPrice < i.originalPrice || i.order.couponId)
      : items;

    const byOrder = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const list = byOrder.get(item.orderId) ?? [];
      list.push(item);
      byOrder.set(item.orderId, list);
    }
    for (const orderItems of byOrder.values()) {
      const paidAt = orderItems[0].order.paidAt;
      if (!paidAt) continue;
      const key = bucketKeyFor(paidAt, granularity);
      const acc = bump(key);
      acc.revenue += orderItems.reduce((s, i) => s + i.finalPrice, 0);
      acc.discounts += sumItemDiscounts(orderItems) + sumCouponDiscounts(orderItems);
      acc.transactions += 1;
    }
  } else {
    const orders = await prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: range.from, lte: range.to } },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        couponId: true,
        couponDiscountAmount: true,
        items: { select: { originalPrice: true, finalPrice: true } },
      },
      take: ANALYTICS_ROW_CAP,
    });

    for (const order of orders) {
      const itemDiscount = order.items.reduce((s, i) => s + Math.max(0, Number(i.originalPrice) - Number(i.finalPrice)), 0);
      const hasDiscount = itemDiscount > 0 || Boolean(order.couponId);
      if (filters.discountedOnly && !hasDiscount) continue;
      const key = bucketKeyFor(order.paidAt!, granularity);
      const acc = bump(key);
      acc.revenue += Number(order.totalAmount);
      acc.discounts += itemDiscount + (order.couponId ? Number(order.couponDiscountAmount) : 0);
      acc.transactions += 1;
    }
  }

  // Refunds are bucketed by their own refundedAt, independent of the paidAt
  // of the order they refund — a refund issued weeks after purchase belongs
  // to the week it was issued, not the week of the original sale.
  const refunds = await prisma.refund.findMany({
    where: { refundedAt: { gte: range.from, lte: range.to } },
    select: { amount: true, refundedAt: true },
    take: ANALYTICS_ROW_CAP,
  });
  for (const refund of refunds) {
    const key = bucketKeyFor(refund.refundedAt, granularity);
    bump(key).refunds += Number(refund.amount);
  }

  return buckets;
}

// Builds the FAILED/PENDING path — these OrderPayment rows never reach
// paidAt, so they're bucketed by createdAt instead and only ever contribute
// a transaction count (no revenue/discount figure exists for a payment that
// didn't complete).
async function buildPaymentStatusSeries(
  range: ResolvedRange,
  granularity: RevenueGranularity,
  status: "FAILED" | "PENDING",
): Promise<Map<string, Accumulator>> {
  const buckets = new Map<string, Accumulator>();
  const rows = await prisma.orderPayment.findMany({
    where: { status, createdAt: { gte: range.from, lte: range.to } },
    select: { createdAt: true },
    take: ANALYTICS_ROW_CAP,
  });
  for (const row of rows) {
    const key = bucketKeyFor(row.createdAt, granularity);
    const acc = buckets.get(key) ?? emptyAccumulator();
    acc.transactions += 1;
    buckets.set(key, acc);
  }
  return buckets;
}

// Revenue trend chart data source — buckets paid revenue/refunds/discounts
// (or, when paymentStatus targets FAILED/PENDING, raw payment-attempt
// counts) by day/week/month across the range. See buildPaidSeries and
// buildPaymentStatusSeries for the two distinct bucketing paths.
export async function getRevenueTrend(
  range: ResolvedRange,
  granularity: RevenueGranularity,
  filters?: RevenueTrendFilters,
): Promise<RevenueTrendResult> {
  const f = filters ?? {};
  const buckets =
    f.paymentStatus === "FAILED" || f.paymentStatus === "PENDING"
      ? await buildPaymentStatusSeries(range, granularity, f.paymentStatus)
      : await buildPaidSeries(range, granularity, f);

  const orderedKeys = orderedBucketKeys(range.from, range.to, granularity);
  const points: RevenueTrendPoint[] = orderedKeys.map((key) => {
    const acc = buckets.get(key) ?? emptyAccumulator();
    return { date: key, ...acc };
  });

  return { granularity, points };
}

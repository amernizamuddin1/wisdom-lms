import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import type { ResolvedRange } from "./date-range";
import {
  getPaidOrderItems,
  sumItemDiscounts,
  sumCouponDiscounts,
  distinctOrderCount,
  type PaidOrderItemRow,
} from "./commerce-shared";

export type CouponUsageRow = {
  couponId: string;
  code: string;
  redemptions: number;
  totalDiscountAmount: number;
  totalOrderRevenue: number;
};

export type DiscountWindowRow = {
  itemType: "COURSE" | "BUNDLE";
  id: string;
  title: string;
  currency: string;
  discountStartAt: Date;
  discountEndAt: Date;
  regularPrice: number;
  averageSellingPriceDuringDiscount: number;
  unitsSoldDuringDiscount: number;
  // Simple before/during counts only — not a causal claim, see comment below.
  ordersInPrior30Days: number;
  ordersDuringDiscountWindow: number;
};

export type DiscountsNearingExpiryRow = {
  itemType: "COURSE" | "BUNDLE";
  id: string;
  title: string;
  currency: string;
  discountEndAt: Date;
  daysRemaining: number;
};

export type DiscountPerformanceResult = {
  couponUsage: CouponUsageRow[];
  discountWindows: DiscountWindowRow[];
  discountValuePerUnit: number;
  discountsNearingExpiry: DiscountsNearingExpiryRow[];
};

// Fetches every CouponRedemption in range, grouped by coupon, plus the
// totalAmount of the orders that redeemed it — "revenue generated" here means
// the whole order's paid total, not just the discounted line item, since a
// coupon can apply across an entire cart.
async function getCouponUsage(range: ResolvedRange): Promise<CouponUsageRow[]> {
  const redemptions = await prisma.couponRedemption.findMany({
    where: { redeemedAt: { gte: range.from, lte: range.to } },
    include: { coupon: { select: { id: true, code: true } }, order: { select: { totalAmount: true } } },
  });

  const byCoupon = new Map<string, { code: string; redemptions: number; discount: number; revenue: number }>();
  for (const r of redemptions) {
    const entry = byCoupon.get(r.couponId) ?? { code: r.coupon.code, redemptions: 0, discount: 0, revenue: 0 };
    entry.redemptions += 1;
    entry.discount += Number(r.discountAmount);
    entry.revenue += Number(r.order.totalAmount);
    byCoupon.set(r.couponId, entry);
  }

  return [...byCoupon.entries()].map(([couponId, v]) => ({
    couponId,
    code: v.code,
    redemptions: v.redemptions,
    totalDiscountAmount: Math.round(v.discount * 100) / 100,
    totalOrderRevenue: Math.round(v.revenue * 100) / 100,
  }));
}

function buildRange(from: Date, to: Date): ResolvedRange {
  // getPaidOrderItems only reads range.from/range.to — key/previousFrom/
  // previousTo are unused for this call, so a "custom" placeholder is safe.
  return { key: "custom", from, to, previousFrom: from, previousTo: from };
}

async function getDiscountWindows(range: ResolvedRange): Promise<DiscountWindowRow[]> {
  const [coursePrices, bundlePrices] = await Promise.all([
    prisma.coursePrice.findMany({
      where: { discountStartAt: { lte: range.to }, discountEndAt: { gte: range.from } },
      select: {
        courseId: true,
        currency: true,
        amount: true,
        discountStartAt: true,
        discountEndAt: true,
        course: { select: { title: true } },
      },
    }),
    prisma.bundlePrice.findMany({
      where: { discountStartAt: { lte: range.to }, discountEndAt: { gte: range.from } },
      select: {
        bundleId: true,
        currency: true,
        amount: true,
        discountStartAt: true,
        discountEndAt: true,
        bundle: { select: { name: true } },
      },
    }),
  ]);

  const rows: DiscountWindowRow[] = [];

  for (const p of coursePrices) {
    if (!p.discountStartAt || !p.discountEndAt) continue;
    const overlapFrom = p.discountStartAt > range.from ? p.discountStartAt : range.from;
    const overlapTo = p.discountEndAt < range.to ? p.discountEndAt : range.to;
    const priorFrom = new Date(p.discountStartAt.getTime() - 30 * 86400000);

    const [duringItems, priorItems] = await Promise.all([
      getPaidOrderItems(buildRange(overlapFrom, overlapTo), { courseId: p.courseId }),
      getPaidOrderItems(buildRange(priorFrom, p.discountStartAt), { courseId: p.courseId }),
    ]);

    rows.push(buildDiscountWindowRow("COURSE", p.courseId, p.course.title, p.currency, p, duringItems, priorItems));
  }

  for (const p of bundlePrices) {
    if (!p.discountStartAt || !p.discountEndAt) continue;
    const overlapFrom = p.discountStartAt > range.from ? p.discountStartAt : range.from;
    const overlapTo = p.discountEndAt < range.to ? p.discountEndAt : range.to;
    const priorFrom = new Date(p.discountStartAt.getTime() - 30 * 86400000);

    const [duringItems, priorItems] = await Promise.all([
      getPaidOrderItems(buildRange(overlapFrom, overlapTo), { bundleId: p.bundleId }),
      getPaidOrderItems(buildRange(priorFrom, p.discountStartAt), { bundleId: p.bundleId }),
    ]);

    rows.push(buildDiscountWindowRow("BUNDLE", p.bundleId, p.bundle.name, p.currency, p, duringItems, priorItems));
  }

  return rows;
}

function buildDiscountWindowRow(
  itemType: "COURSE" | "BUNDLE",
  id: string,
  title: string,
  currency: string,
  price: { amount: unknown; discountStartAt: Date | null; discountEndAt: Date | null },
  duringItems: PaidOrderItemRow[],
  priorItems: PaidOrderItemRow[],
): DiscountWindowRow {
  const unitsSold = duringItems.length;
  const asp = unitsSold === 0 ? 0 : duringItems.reduce((s, i) => s + i.finalPrice, 0) / unitsSold;
  return {
    itemType,
    id,
    title,
    currency,
    discountStartAt: price.discountStartAt as Date,
    discountEndAt: price.discountEndAt as Date,
    regularPrice: Number(price.amount),
    averageSellingPriceDuringDiscount: Math.round(asp * 100) / 100,
    unitsSoldDuringDiscount: unitsSold,
    // Before/during comparison only, not a causal claim — many other factors
    // (seasonality, marketing, catalog changes) can move order counts across
    // the same two windows.
    ordersInPrior30Days: distinctOrderCount(priorItems),
    ordersDuringDiscountWindow: distinctOrderCount(duringItems),
  };
}

async function getDiscountValuePerUnit(range: ResolvedRange): Promise<number> {
  const items = await getPaidOrderItems(range);
  const totalDiscountValue = sumItemDiscounts(items) + sumCouponDiscounts(items);
  const discountedUnits = items.filter((i) => i.originalPrice > i.finalPrice || i.order.couponId).length;
  return discountedUnits === 0 ? 0 : Math.round((totalDiscountValue / discountedUnits) * 100) / 100;
}

async function getDiscountsNearingExpiry(): Promise<DiscountsNearingExpiryRow[]> {
  const tenantId = await getTenantId();
  const settings = await prisma.settings.findUnique({
    where: { tenantId },
    select: { commerceDiscountExpiryAlertDays: true },
  });
  const windowDays = settings?.commerceDiscountExpiryAlertDays ?? 7;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowDays * 86400000);

  const [coursePrices, bundlePrices] = await Promise.all([
    prisma.coursePrice.findMany({
      where: { discountEndAt: { gte: now, lte: windowEnd } },
      select: { courseId: true, currency: true, discountEndAt: true, course: { select: { title: true } } },
    }),
    prisma.bundlePrice.findMany({
      where: { discountEndAt: { gte: now, lte: windowEnd } },
      select: { bundleId: true, currency: true, discountEndAt: true, bundle: { select: { name: true } } },
    }),
  ]);

  const rows: DiscountsNearingExpiryRow[] = [];
  for (const p of coursePrices) {
    if (!p.discountEndAt) continue;
    rows.push({
      itemType: "COURSE",
      id: p.courseId,
      title: p.course.title,
      currency: p.currency,
      discountEndAt: p.discountEndAt,
      daysRemaining: Math.ceil((p.discountEndAt.getTime() - now.getTime()) / 86400000),
    });
  }
  for (const p of bundlePrices) {
    if (!p.discountEndAt) continue;
    rows.push({
      itemType: "BUNDLE",
      id: p.bundleId,
      title: p.bundle.name,
      currency: p.currency,
      discountEndAt: p.discountEndAt,
      daysRemaining: Math.ceil((p.discountEndAt.getTime() - now.getTime()) / 86400000),
    });
  }
  return rows;
}

// Discount-mechanism performance for the Discounts page: coupon-code usage,
// automatic sale-price windows (ASP during the window vs. regular price, plus
// a before/during order-count comparison), blended discount value per unit,
// and discounts about to lapse per Settings.commerceDiscountExpiryAlertDays.
export async function getDiscountPerformance(range: ResolvedRange): Promise<DiscountPerformanceResult> {
  const [couponUsage, discountWindows, discountValuePerUnit, discountsNearingExpiry] = await Promise.all([
    getCouponUsage(range),
    getDiscountWindows(range),
    getDiscountValuePerUnit(range),
    getDiscountsNearingExpiry(),
  ]);

  return { couponUsage, discountWindows, discountValuePerUnit, discountsNearingExpiry };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ResolvedRange } from "./date-range";
import { ANALYTICS_ROW_CAP } from "./shared";

export type PaidOrderItemFilter = {
  courseId?: string | null;
  bundleId?: string | null;
};

export type PaidOrderItemRow = {
  id: string;
  orderId: string;
  itemType: "COURSE" | "BUNDLE";
  courseId: string | null;
  bundleId: string | null;
  titleSnapshot: string;
  originalPrice: number;
  finalPrice: number;
  order: {
    id: string;
    orderNumber: string;
    userId: string;
    currency: string;
    paidAt: Date | null;
    couponId: string | null;
    couponDiscountAmount: number;
  };
};

// The single canonical join of paid Orders (by paidAt in range) to their
// OrderItems, reused by every revenue/product-performance query module so
// the course-vs-bundle counting rule (see definitions.ts's Phase 3 section)
// lives in exactly one place. Bounded by ANALYTICS_ROW_CAP like every other
// raw-row analytics fetch in this directory.
export async function getPaidOrderItems(range: ResolvedRange, filter?: PaidOrderItemFilter): Promise<PaidOrderItemRow[]> {
  const where: Prisma.OrderItemWhereInput = {
    order: { status: "PAID", paidAt: { gte: range.from, lte: range.to } },
    ...(filter?.courseId ? { courseId: filter.courseId } : {}),
    ...(filter?.bundleId ? { bundleId: filter.bundleId } : {}),
  };

  const items = await prisma.orderItem.findMany({
    where,
    select: {
      id: true,
      orderId: true,
      itemType: true,
      courseId: true,
      bundleId: true,
      titleSnapshot: true,
      originalPrice: true,
      finalPrice: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          currency: true,
          paidAt: true,
          couponId: true,
          couponDiscountAmount: true,
        },
      },
    },
    take: ANALYTICS_ROW_CAP,
  });

  return items.map((i) => ({
    ...i,
    originalPrice: Number(i.originalPrice),
    finalPrice: Number(i.finalPrice),
    order: { ...i.order, couponDiscountAmount: Number(i.order.couponDiscountAmount) },
  }));
}

// Sum of per-item sale-price discounts (originalPrice - finalPrice) across a
// set of paid order items — the "automatic discount" mechanism, distinct
// from coupon-code discounts (see Coupon model comment in schema.prisma).
export function sumItemDiscounts(items: PaidOrderItemRow[]): number {
  return items.reduce((sum, i) => sum + Math.max(0, i.originalPrice - i.finalPrice), 0);
}

// Sum of coupon-code discounts across the distinct orders these items belong
// to — couponDiscountAmount lives on Order, not OrderItem, so this dedupes
// by orderId to avoid double-counting when an order has multiple items.
export function sumCouponDiscounts(items: PaidOrderItemRow[]): number {
  const seen = new Map<string, number>();
  for (const i of items) {
    if (i.order.couponId) seen.set(i.order.id, i.order.couponDiscountAmount);
  }
  return [...seen.values()].reduce((s, v) => s + v, 0);
}

export function distinctOrderCount(items: PaidOrderItemRow[]): number {
  return new Set(items.map((i) => i.orderId)).size;
}

export function distinctUserCount(items: PaidOrderItemRow[]): number {
  return new Set(items.map((i) => i.order.userId)).size;
}

// Currency display convention shared across Phase 3 pages — mirrors Phase
// 1's courseRevenue() "Mixed" label for a set spanning more than one
// currency, since Decimal amounts are never summed across currencies.
export function currencyLabelFor(items: { order: { currency: string } }[]): string {
  const currencies = new Set(items.map((i) => i.order.currency));
  if (currencies.size === 0) return "";
  if (currencies.size === 1) return [...currencies][0];
  return "Mixed";
}

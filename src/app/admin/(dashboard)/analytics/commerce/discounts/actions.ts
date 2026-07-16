"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getDiscountPerformance } from "@/lib/analytics/commerce-discounts";

export type DiscountsCsvParams = { range?: string; from?: string; to?: string };

// Exports the Discount Windows table — the most actionable data on this
// page (per-item sale-window performance), not the coupon or expiry lists.
export async function exportDiscountWindowsCsv(params: DiscountsCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const { discountWindows } = await getDiscountPerformance(range);

  const header = [
    "Item",
    "Type",
    "Regular Price",
    "ASP During Discount",
    "Units Sold During Discount",
    "Orders Before (30d)",
    "Orders During Discount Window",
    "Discount Start",
    "Discount End",
  ];

  const csvRows = discountWindows.map((r) => [
    r.title,
    r.itemType,
    `${r.regularPrice} ${r.currency}`,
    `${r.averageSellingPriceDuringDiscount} ${r.currency}`,
    String(r.unitsSoldDuringDiscount),
    String(r.ordersInPrior30Days),
    String(r.ordersDuringDiscountWindow),
    r.discountStartAt.toISOString().slice(0, 10),
    r.discountEndAt.toISOString().slice(0, 10),
  ]);

  return buildCsv([header, ...csvRows]);
}

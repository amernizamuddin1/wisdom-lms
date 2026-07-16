"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getRevenueTrend, type RevenueGranularity } from "@/lib/analytics/commerce-revenue";

export type RevenueTrendCsvParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  bundleId?: string;
  granularity?: string;
  paymentStatus?: string;
  discountedOnly?: string;
};

function resolveGranularity(value?: string): RevenueGranularity {
  return value === "week" || value === "month" ? value : "day";
}

function resolvePaymentStatus(value?: string): "PAID" | "FAILED" | "PENDING" | null {
  return value === "PAID" || value === "FAILED" || value === "PENDING" ? value : null;
}

export async function exportRevenueTrendCsv(params: RevenueTrendCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const granularity = resolveGranularity(params.granularity);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const bundleId = params.bundleId && params.bundleId !== "all" ? params.bundleId : null;
  const paymentStatus = resolvePaymentStatus(params.paymentStatus);
  const discountedOnly = params.discountedOnly === "true";

  const trend = await getRevenueTrend(range, granularity, { courseId, bundleId, paymentStatus, discountedOnly });

  const header = ["Date", "Revenue", "Refunds", "Discounts", "Transactions"];
  const rows = trend.points.map((p) => [p.date, String(p.revenue), String(p.refunds), String(p.discounts), String(p.transactions)]);

  return buildCsv([header, ...rows]);
}

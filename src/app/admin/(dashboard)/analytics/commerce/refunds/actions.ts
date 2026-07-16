"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getRefundMetrics } from "@/lib/analytics/commerce-refunds";

export type RefundsCsvParams = { range?: string; from?: string; to?: string };

export async function exportRefundRowsCsv(params: RefundsCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const { rows } = await getRefundMetrics(range);

  const header = ["Order #", "Items", "Amount", "Reason", "Days to Refund", "Refunded At", "Issued By"];

  const csvRows = rows.map((r) => [
    r.orderNumber,
    r.itemTitles,
    String(r.amount),
    r.reason ?? "",
    r.daysToRefund === null ? "" : String(r.daysToRefund),
    r.refundedAt.toISOString(),
    r.issuedByName,
  ]);

  return buildCsv([header, ...csvRows]);
}

"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getCommerceKpis } from "@/lib/analytics/commerce-overview";

export type CommerceOverviewCsvParams = { range?: string; from?: string; to?: string; courseId?: string };

export async function exportCommerceKpisCsv(params: CommerceOverviewCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const kpis = await getCommerceKpis(range);

  const header = [
    "Gross Revenue",
    "Net Revenue",
    "Transactions",
    "Paying Learners",
    "Average Order Value",
    "Revenue Per Learner",
    "Refund Amount",
    "Discount Value Given",
    "Payment Success Rate (%)",
  ];

  const row = [
    String(kpis.grossRevenue.value),
    String(kpis.netRevenue.value),
    String(kpis.transactions.value),
    String(kpis.payingLearners.value),
    String(kpis.averageOrderValue.value),
    String(kpis.revenuePerLearner.value),
    String(kpis.refundAmount.value),
    String(kpis.discountValueGiven.value),
    String(kpis.paymentSuccessRate.value),
  ];

  return buildCsv([header, row]);
}

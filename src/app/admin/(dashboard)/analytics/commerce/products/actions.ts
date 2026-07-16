"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getProductPerformance } from "@/lib/analytics/commerce-products";

export type ProductPerformanceCsvParams = { range?: string; from?: string; to?: string; q?: string };

export async function exportProductPerformanceCsv(params: ProductPerformanceCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const rows = await getProductPerformance(range, params.q || undefined);

  const header = [
    "Title",
    "Type",
    "Views",
    "Enrollments",
    "Paid Orders",
    "Free Enrollments",
    "Conversion Rate (%)",
    "Gross Revenue",
    "Net Revenue",
    "Average Selling Price",
    "Discounts",
    "Refunds",
    "Completion Rate (%)",
    "Engagement Rate (%)",
    "Revenue per Learner",
  ];

  const csvRows = rows.map((r) => [
    r.title,
    r.itemType,
    String(r.views),
    String(r.enrollments),
    String(r.paidOrders),
    String(r.freeEnrollments),
    String(r.conversionRate),
    `${r.grossRevenue} ${r.currencyLabel}`,
    `${r.netRevenue} ${r.currencyLabel}`,
    `${r.averageSellingPrice} ${r.currencyLabel}`,
    `${r.discounts} ${r.currencyLabel}`,
    `${r.refunds} ${r.currencyLabel}`,
    String(r.completionRate),
    String(r.engagementRate),
    `${r.revenuePerLearner} ${r.currencyLabel}`,
  ]);

  return buildCsv([header, ...csvRows]);
}

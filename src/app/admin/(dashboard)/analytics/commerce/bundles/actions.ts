"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getBundlePerformance } from "@/lib/analytics/commerce-bundles";

export type BundlesCsvParams = { range?: string; from?: string; to?: string };

export async function exportBundlePerformanceCsv(params: BundlesCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const rows = await getBundlePerformance(range);

  const header = [
    "Bundle",
    "Sales",
    "Revenue",
    "Conversion Rate (%)",
    "Average Selling Price",
    "Bundle Utilization (%)",
    "Courses Started After Purchase",
    "Courses Completed After Purchase",
  ];

  const csvRows = rows.map((r) => [
    r.name,
    String(r.sales),
    `${r.revenue} ${r.currencyLabel}`,
    String(r.conversionRate),
    `${r.averageSellingPrice} ${r.currencyLabel}`,
    String(r.bundleUtilization),
    String(r.coursesStartedAfterPurchase),
    String(r.coursesCompletedAfterPurchase),
  ]);

  return buildCsv([header, ...csvRows]);
}

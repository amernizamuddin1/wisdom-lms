"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getRevenueVsEngagementMatrix } from "@/lib/analytics/commerce-engagement-matrix";
import { REVENUE_ENGAGEMENT_QUADRANT_LABELS } from "@/lib/analytics/definitions";

export type MatrixCsvParams = { range?: string; from?: string; to?: string };

export async function exportRevenueEngagementMatrixCsv(params: MatrixCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const { courses } = await getRevenueVsEngagementMatrix(range);

  const header = ["Course", "Revenue", "Completion Rate (%)", "Quadrant"];

  const csvRows = courses.map((c) => [
    c.title,
    String(c.revenue),
    String(c.completionRate),
    REVENUE_ENGAGEMENT_QUADRANT_LABELS[c.quadrant],
  ]);

  return buildCsv([header, ...csvRows]);
}

"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getCommercialFunnel } from "@/lib/analytics/commerce-funnel";

export type CommercialFunnelCsvParams = {
  range?: string;
  from?: string;
  to?: string;
  courseId?: string;
  bundleId?: string;
};

export async function exportCommercialFunnelCsv(params: CommercialFunnelCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const bundleId = params.bundleId && params.bundleId !== "all" ? params.bundleId : null;
  const result = await getCommercialFunnel(range, { courseId, bundleId });

  const header = ["Stage", "Count", "% of Viewed"];
  const csvRows = result.stages.map((s) => [s.label, String(s.count), String(s.percentOfViewed)]);

  return buildCsv([header, ...csvRows]);
}

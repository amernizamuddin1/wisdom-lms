"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getSegmentTransitions, describeTransition } from "@/lib/analytics/segment-history";

export async function exportSegmentTransitionsCsv(params: { range?: string; from?: string; to?: string }): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const result = await getSegmentTransitions(range);

  if (result.insufficientData) {
    return buildCsv([["Note"], ["Not enough segment snapshot history yet for this range."]]);
  }

  const header = ["From Segment", "To Segment", "Learner Count", "Description"];
  const rows = result.transitions.map((t) => [t.from, t.to, String(t.count), describeTransition(t)]);
  return buildCsv([header, ...rows]);
}

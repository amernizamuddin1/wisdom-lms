"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getTopContributors } from "@/lib/analytics/community-analytics";

export async function exportTopContributorsCsv(params: { range?: string; from?: string; to?: string }): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const rows = await getTopContributors(range, 100);

  const header = ["Name", "Email", "Posts", "Replies", "Helpful Answers", "Community XP"];
  const csvRows = rows.map((r) => [r.name, r.email, String(r.posts), String(r.replies), String(r.helpfulAnswers), String(r.communityXp)]);
  return buildCsv([header, ...csvRows]);
}

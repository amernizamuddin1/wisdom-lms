"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { getAtRiskLearnerRows, type AtRiskRow } from "@/lib/analytics/at-risk";
import { formatHours } from "@/lib/analytics/format";

export async function exportAtRiskLearnersCsv(params: { search?: string; sort?: keyof AtRiskRow; sortDir?: "asc" | "desc" }): Promise<string> {
  await requireAdmin();
  const { rows } = await getAtRiskLearnerRows({ ...params, page: 1, pageSize: 100000 });

  const header = [
    "Name",
    "Email",
    "Incomplete Courses",
    "Current Progress (%)",
    "Last Meaningful Activity",
    "Days Inactive",
    "Previous Activity Level",
    "Current Streak",
    "Total Learning Time",
    "Risk Reason",
  ];

  const csvRows = rows.map((r) => [
    r.name,
    r.email,
    r.courses.join("; "),
    String(r.currentProgress),
    r.lastMeaningfulActivityAt ? r.lastMeaningfulActivityAt.toISOString().slice(0, 10) : "",
    r.daysInactive === null ? "" : String(r.daysInactive),
    r.previousActivityLevel,
    String(r.currentStreak),
    formatHours(r.totalLearningTimeSeconds),
    r.riskReason,
  ]);

  return buildCsv([header, ...csvRows]);
}

"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getCoursePerformanceRows } from "@/lib/analytics/courses";

export type OverviewCsvParams = { range?: string; from?: string; to?: string; courseId?: string; q?: string };

export async function exportCoursePerformanceCsv(params: OverviewCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const rows = await getCoursePerformanceRows(courseId, range, params.q || undefined);

  const header = [
    "Course",
    "Status",
    "Learning Status",
    "Total Enrollments",
    "Not Started",
    "In Progress",
    "Completed",
    "Completion Rate (%)",
    "Average Progress (%)",
    "Total Learning Time (hrs, all-time)",
    "Average Quiz Score",
    "Revenue",
  ];

  const csvRows = rows.map((r) => [
    r.title,
    r.status,
    r.learningStatus,
    String(r.totalEnrollments),
    String(r.notStarted),
    String(r.inProgress),
    String(r.completed),
    String(r.completionRate),
    String(r.averageProgress),
    String(Math.round((r.learningTimeSeconds / 3600) * 10) / 10),
    r.averageQuizScore === null ? "" : String(r.averageQuizScore),
    r.currencyLabel ? `${r.revenue} ${r.currencyLabel}` : String(r.revenue),
  ]);

  return buildCsv([header, ...csvRows]);
}

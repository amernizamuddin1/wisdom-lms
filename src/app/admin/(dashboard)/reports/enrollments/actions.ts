"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { fetchEnrollmentReportRows, SOURCE_LABELS, type EnrollmentReportParams } from "./queries";

export async function exportEnrollmentsCsv(params: EnrollmentReportParams): Promise<string> {
  await requireAdmin();

  const rows = await fetchEnrollmentReportRows(params);

  const header = [
    "Learner Name",
    "Learner Email",
    "Course",
    "Status",
    "Source",
    "Source Bundle",
    "Enrolled Date",
    "Access Start",
    "Access End",
  ];

  const csvRows = rows.map((e) => [
    e.user.name,
    e.user.email,
    e.course.title,
    e.status,
    SOURCE_LABELS[e.source],
    e.sourceBundle?.name ?? "",
    e.enrolledAt.toISOString().slice(0, 10),
    e.accessStartAt.toISOString().slice(0, 10),
    e.isPermanent || !e.accessEndAt ? "Permanent" : e.accessEndAt.toISOString().slice(0, 10),
  ]);

  return buildCsv([header, ...csvRows]);
}

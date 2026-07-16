"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { getLearnerTable, type LearnerTableParams } from "@/lib/analytics/learners";
import { SEGMENT_LABELS } from "@/lib/analytics/learner-segments";
import { formatHours } from "@/lib/analytics/format";

export async function exportLearnersCsv(params: LearnerTableParams): Promise<string> {
  await requireAdmin();
  const { rows } = await getLearnerTable({ ...params, page: 1, pageSize: 100000 });

  const header = [
    "Name",
    "Email",
    "Courses Enrolled",
    "Courses Completed",
    "Overall Progress (%)",
    "Total Learning Time",
    "Average Quiz Score",
    "Last Active",
    "Engagement Segment",
    "Current Streak",
    "XP",
  ];

  const csvRows = rows.map((r) => [
    r.name,
    r.email,
    String(r.coursesEnrolled),
    String(r.coursesCompleted),
    String(r.overallProgress),
    formatHours(r.totalLearningTimeSeconds),
    r.averageQuizScore === null ? "" : String(r.averageQuizScore),
    r.lastActiveAt ? r.lastActiveAt.toISOString().slice(0, 10) : "",
    SEGMENT_LABELS[r.segment],
    String(r.currentStreak),
    String(r.xp),
  ]);

  return buildCsv([header, ...csvRows]);
}

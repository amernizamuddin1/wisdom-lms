"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { getRetentionCohorts, type CohortGranularity } from "@/lib/analytics/retention";
import { getCourseEngagementComparison, type CourseEngagementRow } from "@/lib/analytics/course-engagement";
import { resolveDateRange } from "@/lib/analytics/date-range";

export async function exportRetentionCohortsCsv(params: { granularity?: CohortGranularity; courseId?: string }): Promise<string> {
  await requireAdmin();
  const { rows, maxPeriods } = await getRetentionCohorts({
    granularity: params.granularity ?? "week",
    courseId: params.courseId && params.courseId !== "all" ? params.courseId : null,
  });

  const periodLabel = (params.granularity ?? "week") === "week" ? "Week" : "Month";
  const header = ["Cohort", "Cohort Start", "Cohort Size", ...Array.from({ length: maxPeriods + 1 }, (_, i) => `${periodLabel} ${i} Retention (%)`)];
  const csvRows = rows.map((r) => [
    r.cohortLabel,
    r.cohortStart,
    String(r.cohortSize),
    ...r.periods.map((p) => (p.retentionPercent === null ? "" : String(p.retentionPercent))),
  ]);
  return buildCsv([header, ...csvRows]);
}

export async function exportCourseEngagementCsv(params: {
  range?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: keyof CourseEngagementRow;
  sortDir?: "asc" | "desc";
}): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const { rows } = await getCourseEngagementComparison({ range, search: params.search, sort: params.sort, sortDir: params.sortDir, page: 1, pageSize: 100000 });

  const header = [
    "Course",
    "Enrollments",
    "Active Learners",
    "Active Learner Rate (%)",
    "Avg Active Days",
    "Avg Learning Minutes",
    "Completion Rate (%)",
    "At-Risk Learners",
    "At-Risk Rate (%)",
    "Returning Learner Rate (%)",
    "Community Participation Rate (%)",
  ];
  const csvRows = rows.map((r) => [
    r.title,
    String(r.enrollments),
    String(r.activeLearners),
    String(r.activeLearnerRatePercent),
    String(r.averageActiveDays),
    String(r.averageLearningMinutes),
    String(r.completionRatePercent),
    String(r.atRiskLearners),
    String(r.atRiskRatePercent),
    String(r.returningLearnerRatePercent),
    r.communityParticipationRatePercent === null ? "" : String(r.communityParticipationRatePercent),
  ]);
  return buildCsv([header, ...csvRows]);
}

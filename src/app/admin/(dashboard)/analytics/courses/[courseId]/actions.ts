"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { getLessonDropoff, sortDropoffRows, type DropoffSort } from "@/lib/analytics/lesson-dropoff";

export async function exportLessonDropoffCsv(courseId: string, sort: DropoffSort): Promise<string> {
  await requireAdmin();
  const { rows } = await getLessonDropoff(courseId);
  const sorted = sortDropoffRows(rows, sort);

  const header = ["#", "Lesson", "Chapter", "Learners Started", "Learners Completed", "Completion Rate (%)", "Drop-Off Rate (%)", "Stopped Here"];
  const csvRows = sorted.map((r) => [
    String(r.order),
    r.title,
    r.chapterTitle,
    String(r.learnersEligible),
    String(r.learnersCompleted),
    String(r.completionRate),
    r.dropOffRate === null ? "" : String(r.dropOffRate),
    String(r.stoppedAfterCount),
  ]);

  return buildCsv([header, ...csvRows]);
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { HIGH_DROPOFF_THRESHOLD_PERCENT } from "./definitions";

export type LessonDropoffRow = {
  lessonId: string;
  title: string;
  chapterTitle: string;
  order: number; // 1-based sequence across the whole course
  learnersEligible: number;
  learnersCompleted: number;
  completionRate: number;
  dropOffRate: number | null; // null for the final lesson (no "next lesson" to drop off from)
  stoppedAfterCount: number;
  isHighDropoff: boolean;
};

export type LessonDropoffInsight = { lessonTitle: string; stoppedAfterPercent: number } | null;

// "Average time spent" per lesson is intentionally omitted — the schema has
// no per-lesson time-tracking table (only course-level cumulative totals via
// UserCourseLearningTime), so it can't be computed without fabricating data.
export async function getLessonDropoff(
  courseId: string,
): Promise<{ rows: LessonDropoffRow[]; insight: LessonDropoffInsight }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      chapters: {
        orderBy: { order: "asc" },
        select: { title: true, order: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } },
      },
    },
  });
  if (!course) return { rows: [], insight: null };

  const flatLessons = course.chapters.flatMap((c) => c.lessons.map((l) => ({ ...l, chapterTitle: c.title })));
  if (flatLessons.length === 0) return { rows: [], insight: null };

  const [enrollments, progress, completionEvents] = await Promise.all([
    prisma.enrollment.findMany({ where: { courseId, status: "ACTIVE" }, select: { userId: true } }),
    prisma.lessonProgress.findMany({
      where: { lessonId: { in: flatLessons.map((l) => l.id) }, completedAt: { not: null } },
      select: { lessonId: true, userId: true },
    }),
    prisma.userActivityEvent.findMany({
      where: { type: "COURSE_COMPLETED", courseId },
      select: { userId: true },
    }),
  ]);

  const totalEnrolled = enrollments.length;
  const completedCourseUsers = new Set(completionEvents.map((e) => e.userId));

  const completedByLesson = new Map<string, Set<string>>();
  for (const l of flatLessons) completedByLesson.set(l.id, new Set());
  for (const p of progress) completedByLesson.get(p.lessonId)?.add(p.userId);

  // Per-learner: highest lesson index they've completed (for "stopped after").
  const maxIndexByUser = new Map<string, number>();
  flatLessons.forEach((l, index) => {
    for (const userId of completedByLesson.get(l.id) ?? []) {
      maxIndexByUser.set(userId, Math.max(maxIndexByUser.get(userId) ?? -1, index));
    }
  });

  const stoppedAfterCountByIndex = new Map<number, number>();
  for (const [userId, maxIndex] of maxIndexByUser) {
    if (maxIndex < 0) continue;
    if (completedCourseUsers.has(userId)) continue; // finished the course — didn't "stop"
    stoppedAfterCountByIndex.set(maxIndex, (stoppedAfterCountByIndex.get(maxIndex) ?? 0) + 1);
  }

  const rows: LessonDropoffRow[] = flatLessons.map((lesson, index) => {
    const completedSet = completedByLesson.get(lesson.id) ?? new Set<string>();
    const learnersCompleted = completedSet.size;
    const learnersEligible = index === 0 ? totalEnrolled : (completedByLesson.get(flatLessons[index - 1].id)?.size ?? 0);
    const completionRate = learnersEligible === 0 ? 0 : Math.round((learnersCompleted / learnersEligible) * 1000) / 10;

    let dropOffRate: number | null = null;
    if (index < flatLessons.length - 1) {
      const nextSet = completedByLesson.get(flatLessons[index + 1].id) ?? new Set<string>();
      let both = 0;
      for (const userId of completedSet) if (nextSet.has(userId)) both += 1;
      dropOffRate = learnersCompleted === 0 ? null : Math.round((1 - both / learnersCompleted) * 1000) / 10;
    }

    return {
      lessonId: lesson.id,
      title: lesson.title,
      chapterTitle: lesson.chapterTitle,
      order: index + 1,
      learnersEligible,
      learnersCompleted,
      completionRate,
      dropOffRate,
      stoppedAfterCount: stoppedAfterCountByIndex.get(index) ?? 0,
      isHighDropoff: dropOffRate !== null && dropOffRate >= HIGH_DROPOFF_THRESHOLD_PERCENT,
    };
  });

  let insight: LessonDropoffInsight = null;
  const startedCount = rows[0]?.learnersEligible ?? 0;
  if (startedCount > 0) {
    const worst = rows.reduce((max, r) => (r.stoppedAfterCount > (max?.stoppedAfterCount ?? -1) ? r : max), null as LessonDropoffRow | null);
    if (worst && worst.stoppedAfterCount > 0) {
      const percent = Math.round((worst.stoppedAfterCount / startedCount) * 1000) / 10;
      if (percent >= HIGH_DROPOFF_THRESHOLD_PERCENT) {
        insight = { lessonTitle: worst.title, stoppedAfterPercent: percent };
      }
    }
  }

  return { rows, insight };
}

export type DropoffSort = "order" | "highest-dropoff" | "lowest-completion" | "highest-avg-time";

export function sortDropoffRows(rows: LessonDropoffRow[], sort: DropoffSort): LessonDropoffRow[] {
  const copy = [...rows];
  switch (sort) {
    case "highest-dropoff":
      return copy.sort((a, b) => (b.dropOffRate ?? -1) - (a.dropOffRate ?? -1));
    case "lowest-completion":
      return copy.sort((a, b) => a.completionRate - b.completionRate);
    case "highest-avg-time":
      // No per-lesson time data available (see module comment) — falls back to course order.
      return copy.sort((a, b) => a.order - b.order);
    case "order":
    default:
      return copy.sort((a, b) => a.order - b.order);
  }
}

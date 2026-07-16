import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { awardXp, getRuleXpAmount } from "./xp";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

export type CourseCompletionSnapshot = {
  courseId: string;
  chapters: { id: string; isComplete: boolean }[];
  isCourseComplete: boolean;
};

// Formalizes the existing ad-hoc rule already used in
// src/app/dashboard/page.tsx and src/app/dashboard/courses/[courseId]/page.tsx:
// a module (chapter) or course is complete when every lesson in it has
// LessonProgress.completedAt set and every attached quiz has at least one
// passed QuizAttempt ("ever passed" — matching existing behavior exactly,
// not latest/best attempt). Not reinvented, just centralized. Exported (not
// just used internally) so the one-time launch backfill script can detect
// pre-existing completions without duplicating this logic or going through
// the XP-awarding path below (see scripts/backfill-gamification-completions.ts).
export async function computeCourseCompletion(
  tx: Tx,
  userId: string,
  courseId: string,
): Promise<CourseCompletionSnapshot> {
  const course = await tx.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      quizzes: { where: { chapterId: null }, select: { id: true } },
      chapters: {
        select: {
          id: true,
          lessons: { select: { id: true } },
          quizzes: { select: { id: true } },
        },
      },
    },
  });

  const allLessonIds = course.chapters.flatMap((c) => c.lessons.map((l) => l.id));
  const allQuizIds = [
    ...course.quizzes.map((q) => q.id),
    ...course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
  ];

  const [completedLessons, passedAttempts] = await Promise.all([
    tx.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessonIds }, completedAt: { not: null } },
      select: { lessonId: true },
    }),
    tx.quizAttempt.findMany({
      where: { userId, quizId: { in: allQuizIds }, passed: true },
      select: { quizId: true },
    }),
  ]);

  const completedLessonIds = new Set(completedLessons.map((l) => l.lessonId));
  const passedQuizIds = new Set(passedAttempts.map((a) => a.quizId));

  const chapters = course.chapters.map((c) => {
    const lessonsDone = c.lessons.every((l) => completedLessonIds.has(l.id));
    const quizzesDone = c.quizzes.every((q) => passedQuizIds.has(q.id));
    const hasContent = c.lessons.length > 0 || c.quizzes.length > 0;
    return { id: c.id, isComplete: hasContent && lessonsDone && quizzesDone };
  });

  const hasContent = allLessonIds.length > 0 || allQuizIds.length > 0;
  const isCourseComplete =
    hasContent &&
    allLessonIds.every((id) => completedLessonIds.has(id)) &&
    allQuizIds.every((id) => passedQuizIds.has(id));

  return { courseId, chapters, isCourseComplete };
}

// Called after LESSON_COMPLETED / QUIZ_PASSED for the relevant course. Fires
// dedup-safe MODULE_COMPLETED / COURSE_COMPLETED events + XP for anything
// newly detected as complete (checked via UserActivityEvent existence, so
// re-checking on every subsequent lesson/quiz never re-fires or re-awards).
export async function checkModuleAndCourseCompletion(
  tx: Tx,
  params: { userId: string; courseId: string },
): Promise<{ newlyCompletedChapterIds: string[]; courseNewlyCompleted: boolean }> {
  const tenantId = await getTenantId();

  const snapshot = await computeCourseCompletion(tx, params.userId, params.courseId);
  const newlyCompletedChapterIds: string[] = [];

  for (const chapter of snapshot.chapters) {
    if (!chapter.isComplete) continue;

    const alreadyFired = await tx.userActivityEvent.findFirst({
      where: { userId: params.userId, type: "MODULE_COMPLETED", chapterId: chapter.id },
      select: { id: true },
    });
    if (alreadyFired) continue;

    const amount = await getRuleXpAmount(tx, "MODULE_COMPLETED");
    const result = await awardXp(tx, {
      userId: params.userId,
      ruleCode: "MODULE_COMPLETED",
      amount,
      reason: "Module completed",
      dedupeKey: `MODULE_COMPLETED:${chapter.id}`,
      relatedEntityType: "CHAPTER",
      relatedEntityId: chapter.id,
    });

    await tx.userActivityEvent.create({
      data: {
        userId: params.userId,
        type: "MODULE_COMPLETED",
        courseId: params.courseId,
        chapterId: chapter.id,
        xpAwarded: result.amount,
        tenantId,
      },
    });

    newlyCompletedChapterIds.push(chapter.id);
  }

  let courseNewlyCompleted = false;
  if (snapshot.isCourseComplete) {
    const alreadyFired = await tx.userActivityEvent.findFirst({
      where: { userId: params.userId, type: "COURSE_COMPLETED", courseId: params.courseId },
      select: { id: true },
    });

    if (!alreadyFired) {
      const amount = await getRuleXpAmount(tx, "COURSE_COMPLETED");
      const result = await awardXp(tx, {
        userId: params.userId,
        ruleCode: "COURSE_COMPLETED",
        amount,
        reason: "Course completed",
        dedupeKey: `COURSE_COMPLETED:${params.courseId}`,
        relatedEntityType: "COURSE",
        relatedEntityId: params.courseId,
      });

      await tx.userActivityEvent.create({
        data: {
          userId: params.userId,
          type: "COURSE_COMPLETED",
          courseId: params.courseId,
          xpAwarded: result.amount,
          tenantId,
        },
      });

      courseNewlyCompleted = true;
    }
  }

  return { newlyCompletedChapterIds, courseNewlyCompleted };
}

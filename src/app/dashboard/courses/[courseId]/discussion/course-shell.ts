import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Shared course-shell data (title + sidebar nav content) needed by every
// page under this discussion/ segment, so the left nav stays present and
// consistent with the lesson view at /dashboard/courses/[courseId]. Kept
// separate from the lesson page's data-fetch (progress/quiz-attempt state)
// since the discussion pages don't need per-lesson completion detail beyond
// what the sidebar renders.
export async function getCourseShell(courseId: string, userId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      quizzes: { where: { chapterId: null }, orderBy: { title: "asc" } },
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
          quizzes: { orderBy: { title: "asc" } },
        },
      },
    },
  });
  if (!course) notFound();

  const allLessonIds = course.chapters.flatMap((c) => c.lessons.map((l) => l.id));
  const allQuizIds = [
    ...course.quizzes.map((q) => q.id),
    ...course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
  ];

  const [completedLessons, passedAttempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessonIds }, completedAt: { not: null } },
      select: { lessonId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, quizId: { in: allQuizIds }, passed: true },
      select: { quizId: true },
    }),
  ]);

  return {
    course,
    sidebarChapters: course.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      lessons: chapter.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
      quizzes: chapter.quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title })),
    })),
    sidebarCourseQuizzes: course.quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title })),
    completedLessonIds: completedLessons.map((l) => l.lessonId),
    passedQuizIds: passedAttempts.map((a) => a.quizId),
  };
}

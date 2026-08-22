"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getOptionalUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordLessonCompleted, recordLearningHeartbeat } from "@/lib/gamification/events";
import { maybeIssueCertificate } from "@/lib/gamification/certificates";
import { getTenantId } from "@/lib/tenant-context";

export async function markLessonComplete(courseId: string, lessonId: string) {
  const user = await requireUser();
  const tenantId = await getTenantId();

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId, status: "ACTIVE" },
  });
  if (!enrollment) throw new Error("Not enrolled in this course.");

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, chapter: { courseId } },
  });
  if (!lesson) throw new Error("Lesson not found in this course.");

  const alreadyCompleted = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { tenantId, userId: user.id, lessonId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });

  // Gamification only reacts to a genuinely new completion — re-marking an
  // already-completed lesson (e.g. reopening it) must not re-run XP/streak
  // logic. recordLessonCompleted is itself dedupe-safe for XP, but skipping
  // the call entirely here avoids the redundant completion/achievement scan.
  if (!alreadyCompleted?.completedAt) {
    const result = await prisma.$transaction((tx) =>
      recordLessonCompleted(tx, { userId: user.id, courseId, chapterId: lesson.chapterId, lessonId }),
    );

    // Certificate issuance renders a PDF via a real headless browser, which
    // routinely exceeds Prisma's 5s interactive-transaction timeout — kept
    // out of the transaction above and run separately, in its own
    // transaction with a much longer timeout, so a slow render can't
    // silently roll back the completion/XP/achievement writes that already
    // committed.
    if (result.courseNewlyCompletedId) {
      await prisma.$transaction(
        (tx) => maybeIssueCertificate(tx, { userId: user.id, courseId: result.courseNewlyCompletedId! }),
        { timeout: 30_000 },
      );
    }
  }

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath("/dashboard");
}

// Called periodically by the client-side LessonTimeTracker while a learner
// is actively engaged with a lesson (tab visible, recent interaction — see
// that component for the inactivity/cross-tab logic). Silently no-ops for
// an unauthenticated caller or a course the caller isn't actively enrolled
// in, rather than throwing — a stale heartbeat firing after a session ends
// shouldn't surface an error to the page.
export async function recordLearningTimeHeartbeat(
  courseId: string,
  lessonId: string,
  seconds: number,
  isVideo: boolean,
) {
  const user = await getOptionalUser();
  if (!user) return;

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId, status: "ACTIVE" },
  });
  if (!enrollment) return;

  await prisma.$transaction((tx) =>
    recordLearningHeartbeat(tx, { userId: user.id, courseId, lessonId, seconds, isVideo }),
  );
}

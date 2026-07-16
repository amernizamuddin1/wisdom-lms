import "server-only";
import { prisma } from "@/lib/prisma";
import { FUNNEL_STAGES, FUNNEL_STAGE_LABELS, type FunnelStage } from "./definitions";
import { getCourseItemIds } from "./shared";

export type EnrollmentProgressInfo = { started: boolean; percent: number; completed: boolean };

// Classifies every active enrollment in a single course against the funnel
// stages. Cumulative semantics — each stage is a superset of the next
// (Reached 50% implies Reached 25%), matching how the funnel is meant to read.
export async function classifyCourseEnrollments(
  courseId: string,
  enrolledRange?: { from: Date; to: Date },
): Promise<Map<string, EnrollmentProgressInfo>> {
  const { lessonIds, quizIds } = await getCourseItemIds(courseId);
  const totalItems = lessonIds.length + quizIds.length;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId,
      status: "ACTIVE",
      ...(enrolledRange ? { enrolledAt: { gte: enrolledRange.from, lte: enrolledRange.to } } : {}),
    },
    select: { userId: true },
  });
  const userIds = enrollments.map((e) => e.userId);
  const result = new Map<string, EnrollmentProgressInfo>();
  if (userIds.length === 0) return result;

  const [completedLessons, quizAttempts, learningTimes, completedEvents] = await Promise.all([
    lessonIds.length
      ? prisma.lessonProgress.findMany({
          where: { userId: { in: userIds }, lessonId: { in: lessonIds }, completedAt: { not: null } },
          select: { userId: true },
        })
      : Promise.resolve([]),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: { userId: { in: userIds }, quizId: { in: quizIds }, passed: true },
          select: { userId: true, quizId: true },
        })
      : Promise.resolve([]),
    prisma.userCourseLearningTime.findMany({
      where: { courseId, userId: { in: userIds }, learningTimeSeconds: { gt: 0 } },
      select: { userId: true },
    }),
    prisma.userActivityEvent.findMany({
      where: { type: "COURSE_COMPLETED", courseId, userId: { in: userIds } },
      select: { userId: true },
    }),
  ]);

  const lessonCountByUser = new Map<string, number>();
  for (const r of completedLessons) lessonCountByUser.set(r.userId, (lessonCountByUser.get(r.userId) ?? 0) + 1);

  const passedQuizzesByUser = new Map<string, Set<string>>();
  for (const r of quizAttempts) {
    const set = passedQuizzesByUser.get(r.userId) ?? new Set<string>();
    set.add(r.quizId);
    passedQuizzesByUser.set(r.userId, set);
  }

  const startedByLearningTime = new Set(learningTimes.map((r) => r.userId));
  const completedByEvent = new Set(completedEvents.map((r) => r.userId));

  for (const userId of userIds) {
    const completedItems = (lessonCountByUser.get(userId) ?? 0) + (passedQuizzesByUser.get(userId)?.size ?? 0);
    const completed = completedByEvent.has(userId);
    // A course with no lessons/quizzes yet has totalItems === 0, so the item-based
    // percent is meaningless — but canonical completion (the COURSE_COMPLETED event)
    // is independent of totalItems. Without this, such a learner could show
    // completed: true with percent: 0, breaking the funnel's cumulative invariant
    // (Completed learners must also count as Reached 75%/50%/25%).
    const percent = totalItems === 0 ? (completed ? 100 : 0) : Math.round((completedItems / totalItems) * 100);
    const started = startedByLearningTime.has(userId) || completedItems > 0;
    result.set(userId, { started, percent, completed });
  }

  return result;
}

function stageMatches(stage: FunnelStage, info: EnrollmentProgressInfo): boolean {
  switch (stage) {
    case "ENROLLED":
      return true;
    case "STARTED":
      return info.started;
    case "REACHED_25":
      return info.percent >= 25;
    case "REACHED_50":
      return info.percent >= 50;
    case "REACHED_75":
      return info.percent >= 75;
    case "COMPLETED":
      return info.completed;
  }
}

export type FunnelStageCount = { stage: FunnelStage; label: string; count: number; percentOfEnrolled: number };

// courseId = null aggregates across every course by summing per-course stage
// counts — this counts enrollment instances, not distinct learners (a
// learner enrolled in 3 courses can contribute to each stage up to 3 times).
export async function getEnrollmentFunnel(
  courseId: string | null,
  enrolledRange?: { from: Date; to: Date },
): Promise<FunnelStageCount[]> {
  const courseIds = courseId ? [courseId] : (await prisma.course.findMany({ select: { id: true } })).map((c) => c.id);

  const totals: Record<FunnelStage, number> = {
    ENROLLED: 0,
    STARTED: 0,
    REACHED_25: 0,
    REACHED_50: 0,
    REACHED_75: 0,
    COMPLETED: 0,
  };

  // Course count is bounded by the catalog (not learner count), so running
  // classification in parallel across courses rather than one-at-a-time is a
  // right-sized fix — no rollup table needed at this scale.
  const perCourseClassifications = await Promise.all(
    courseIds.map((cid) => classifyCourseEnrollments(cid, enrolledRange)),
  );
  for (const classified of perCourseClassifications) {
    for (const info of classified.values()) {
      for (const stage of FUNNEL_STAGES) {
        if (stageMatches(stage, info)) totals[stage] += 1;
      }
    }
  }

  const enrolledTotal = totals.ENROLLED;
  return FUNNEL_STAGES.map((stage) => ({
    stage,
    label: FUNNEL_STAGE_LABELS[stage],
    count: totals[stage],
    percentOfEnrolled: enrolledTotal === 0 ? 0 : Math.round((totals[stage] / enrolledTotal) * 1000) / 10,
  }));
}

// Distinct learner ids matching a stage, for the "click a stage" drill-down.
// When courseId is null, unions matches across every course (a learner shows
// up once even if they matched the stage via more than one course).
export async function getFunnelStageLearnerIds(
  courseId: string | null,
  stage: FunnelStage,
  enrolledRange?: { from: Date; to: Date },
): Promise<Set<string>> {
  const courseIds = courseId ? [courseId] : (await prisma.course.findMany({ select: { id: true } })).map((c) => c.id);
  const ids = new Set<string>();
  const perCourseClassifications = await Promise.all(
    courseIds.map((cid) => classifyCourseEnrollments(cid, enrolledRange)),
  );
  for (const classified of perCourseClassifications) {
    for (const [userId, info] of classified) {
      if (stageMatches(stage, info)) ids.add(userId);
    }
  }
  return ids;
}

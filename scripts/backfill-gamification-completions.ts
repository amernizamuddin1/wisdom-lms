// One-time launch backfill: for every existing active enrollment, detect
// modules/courses that were already complete before the gamification
// feature shipped and record MODULE_COMPLETED/COURSE_COMPLETED events for
// them (xpAwarded: 0 — XP only accrues from real activity going forward,
// this only makes existing completion-count achievements and analytics
// accurate for already-completed work). Then evaluates achievements so
// e.g. a learner who already finished 3 courses sees "Triple Crown"
// immediately rather than after their next unrelated action.
//
// Idempotent: safe to re-run — checkModuleAndCourseCompletion-style
// existence checks prevent duplicate event rows.
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { computeCourseCompletion } from "@/lib/gamification/completion";
import { evaluateAchievements } from "@/lib/gamification/achievements";
import { getTenantId } from "@/lib/tenant-context";

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE" },
    select: { userId: true, courseId: true },
  });

  const byUser = new Map<string, string[]>();
  for (const e of enrollments) {
    byUser.set(e.userId, [...(byUser.get(e.userId) ?? []), e.courseId]);
  }

  let moduleEvents = 0;
  let courseEvents = 0;

  for (const [userId, courseIds] of byUser) {
    const relevantKinds = new Set<string>();

    await prisma.$transaction(async (tx) => {
      const tenantId = await getTenantId();
      for (const courseId of courseIds) {
        const snapshot = await computeCourseCompletion(tx, userId, courseId);

        for (const chapter of snapshot.chapters) {
          if (!chapter.isComplete) continue;
          const exists = await tx.userActivityEvent.findFirst({
            where: { userId, type: "MODULE_COMPLETED", chapterId: chapter.id },
            select: { id: true },
          });
          if (exists) continue;
          await tx.userActivityEvent.create({
            data: { userId, type: "MODULE_COMPLETED", courseId, chapterId: chapter.id, xpAwarded: 0, tenantId },
          });
          moduleEvents++;
          relevantKinds.add("MODULE_COUNT");
          relevantKinds.add("FAST_STARTER");
        }

        if (snapshot.isCourseComplete) {
          const exists = await tx.userActivityEvent.findFirst({
            where: { userId, type: "COURSE_COMPLETED", courseId },
            select: { id: true },
          });
          if (!exists) {
            await tx.userActivityEvent.create({
              data: { userId, type: "COURSE_COMPLETED", courseId, xpAwarded: 0, tenantId },
            });
            courseEvents++;
            relevantKinds.add("COURSE_COUNT");
          }
        }
      }

      relevantKinds.add("LESSON_COUNT");
      relevantKinds.add("QUIZ_PASS_COUNT");
      relevantKinds.add("QUIZ_PERFECT_COUNT");
      relevantKinds.add("QUIZ_HIGH_SCORE_COUNT");
      relevantKinds.add("QUIZ_FIRST_ATTEMPT_HIGH");

      const unlocked = await evaluateAchievements(tx, {
        userId,
        relevantKinds: [...relevantKinds] as Parameters<typeof evaluateAchievements>[1]["relevantKinds"],
      });
      if (unlocked.length > 0) {
        console.log(`  user ${userId}: unlocked ${unlocked.map((a) => a.id).join(", ")}`);
      }
    });
  }

  console.log(`Backfilled ${moduleEvents} module-completed and ${courseEvents} course-completed events across ${byUser.size} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

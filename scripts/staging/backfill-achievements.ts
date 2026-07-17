// Idempotent, tenant-scoped reconciliation: re-evaluates achievements for
// every user with any recorded learning activity, awarding any
// UserAchievement rows that were never created because the activity that
// satisfied their criteria was written outside the normal event pipeline
// (e.g. src/lib/gamification/events.ts's recordQuizAttempt/recordLessonCompleted/
// etc., which are the only code paths that normally call evaluateAchievements()).
//
// Safe to re-run any number of times: evaluateAchievements() only ever
// creates a UserAchievement row once per (userId, achievementId) — the
// unique constraint + P2002 catch in src/lib/gamification/achievements.ts
// makes every award idempotent, so reconciliation never produces duplicates.
//
// Run with: npx tsx --conditions=react-server scripts/staging/backfill-achievements.ts
// (the --conditions flag is required because this script, via @/lib/prisma
// and @/lib/gamification/achievements, transitively imports "server-only",
// which throws unless resolved through its react-server export condition.)
//
// Guarded against ever running against production by ./db.ts -> ./env.ts,
// which hard-blocks the production Supabase project ref unconditionally.
import { db } from "./db";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import { evaluateAchievements, type CriteriaKind } from "@/lib/gamification/achievements";

// The full set of criteria kinds this reconciliation checks. Mirrors the
// quiz kinds from scripts/staging/seed-tenant-fixtures.ts's fix plus the
// completion/streak/learning-time kinds from
// scripts/backfill-gamification-completions.ts, so a single reconciliation
// run covers everything computeAchievementProgress() can read directly from
// existing rows (i.e. every kind except CONTRIBUTION_COUNT/HELPFUL_*, which
// depend on live discussion data already covered by their own event
// handlers, and EARLY_ADOPTER, which is migration-only).
const ALL_RELEVANT_KINDS: CriteriaKind[] = [
  "LESSON_COUNT",
  "MODULE_COUNT",
  "COURSE_COUNT",
  "QUIZ_PASS_COUNT",
  "QUIZ_PERFECT_COUNT",
  "QUIZ_HIGH_SCORE_COUNT",
  "QUIZ_FIRST_ATTEMPT_HIGH",
  "STREAK_DAYS",
  "LEARNING_HOURS",
  "FAST_STARTER",
  "WEEKEND_STREAK",
  "NIGHT_SESSIONS",
];

async function reconcileTenant(tenantId: string, tenantSlug: string): Promise<void> {
  const [quizUserIds, eventUserIds, lessonUserIds] = await Promise.all([
    db.quizAttempt.findMany({ where: { tenantId }, distinct: ["userId"], select: { userId: true } }),
    db.userActivityEvent.findMany({ where: { tenantId }, distinct: ["userId"], select: { userId: true } }),
    db.lessonProgress.findMany({
      where: { tenantId, completedAt: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const userIds = new Set<string>([
    ...quizUserIds.map((r) => r.userId),
    ...eventUserIds.map((r) => r.userId),
    ...lessonUserIds.map((r) => r.userId),
  ]);

  if (userIds.size === 0) {
    console.log(`[backfill-achievements] tenant ${tenantSlug}: no learners with activity, skipping.`);
    return;
  }

  console.log(`[backfill-achievements] tenant ${tenantSlug}: reconciling ${userIds.size} learner(s)...`);

  await runWithTenantContext({ tenantId, tenantSlug }, async () => {
    for (const userId of userIds) {
      try {
        const unlocked = await prisma.$transaction((tx) =>
          evaluateAchievements(tx, { userId, relevantKinds: ALL_RELEVANT_KINDS }),
        );
        if (unlocked.length > 0) {
          console.log(`  user ${userId}: awarded ${unlocked.map((a) => a.id).join(", ")}`);
        }
      } catch (err) {
        // Reconciliation is best-effort per user — one bad row must not
        // abort the rest of the tenant's (or other tenants') reconciliation.
        console.error(`  user ${userId}: FAILED —`, err);
      }
    }
  });
}

async function main() {
  const tenants = await db.tenant.findMany({ select: { id: true, slug: true } });
  console.log(`[backfill-achievements] found ${tenants.length} tenant(s).`);

  for (const tenant of tenants) {
    await reconcileTenant(tenant.id, tenant.slug);
  }

  console.log("[backfill-achievements] done.");
  await db.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

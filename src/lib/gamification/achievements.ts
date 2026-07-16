import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { awardXp } from "./xp";
import { getHourForUser, getDateKeyForUser } from "./timezone";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

export type UnlockedAchievement = {
  id: string;
  name: string;
  description: string;
  category: string;
  xpReward: number;
  assetPath: string;
};

export type CriteriaKind =
  | "LESSON_COUNT"
  | "MODULE_COUNT"
  | "COURSE_COUNT"
  | "QUIZ_PASS_COUNT"
  | "QUIZ_PERFECT_COUNT"
  | "QUIZ_HIGH_SCORE_COUNT"
  | "QUIZ_FIRST_ATTEMPT_HIGH"
  | "STREAK_DAYS"
  | "LEARNING_HOURS"
  | "CONTRIBUTION_COUNT"
  | "HELPFUL_REACTIONS_COUNT"
  | "HELPFUL_ANSWER_COUNT"
  | "FAST_STARTER"
  | "WEEKEND_STREAK"
  | "NIGHT_SESSIONS"
  | "EARLY_ADOPTER";

export type Criteria = { kind: CriteriaKind; threshold?: number; withinHours?: number; afterHour?: number };

export type AchievementContext = {
  userId: string;
  /** Only definitions whose criteria kind is in this list are evaluated — keeps each check narrow and cheap. */
  relevantKinds: CriteriaKind[];
  quizId?: string;
};

// Runs after a relevant event (lesson/module/course completion, quiz
// attempt, streak update, learning-time heartbeat) and unlocks any
// newly-qualifying, not-yet-earned achievement, awarding its XP reward.
export async function evaluateAchievements(
  tx: Tx,
  ctx: AchievementContext,
): Promise<UnlockedAchievement[]> {
  const tenantId = await getTenantId();

  const [definitions, alreadyEarned] = await Promise.all([
    tx.achievementDefinition.findMany({ where: { isActive: true } }),
    tx.userAchievement.findMany({ where: { userId: ctx.userId }, select: { achievementId: true } }),
  ]);
  const earnedIds = new Set(alreadyEarned.map((a) => a.achievementId));

  const candidates = definitions.filter((d) => {
    if (earnedIds.has(d.id)) return false;
    const criteria = d.unlockCriteriaJson as Criteria | null;
    return criteria?.kind && ctx.relevantKinds.includes(criteria.kind);
  });
  if (candidates.length === 0) return [];

  const unlocked: UnlockedAchievement[] = [];

  for (const def of candidates) {
    const criteria = def.unlockCriteriaJson as Criteria;
    const progress = await computeAchievementProgress(tx, ctx.userId, criteria, ctx);
    const threshold = criteria.threshold ?? 1;
    if (progress < threshold) continue;

    try {
      await tx.userAchievement.create({
        data: { userId: ctx.userId, achievementId: def.id, progressCurrent: progress, tenantId },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }

    if (def.xpReward > 0) {
      await awardXp(tx, {
        userId: ctx.userId,
        ruleCode: "BADGE_EARNED",
        amount: def.xpReward,
        reason: `Badge earned: ${def.name}`,
        dedupeKey: `BADGE_EARNED:${def.id}`,
        relatedEntityType: "ACHIEVEMENT",
        relatedEntityId: def.id,
      });
    }

    await tx.userActivityEvent.create({
      data: {
        userId: ctx.userId,
        type: "BADGE_EARNED",
        xpAwarded: def.xpReward,
        metadataJson: { achievementId: def.id },
        tenantId,
      },
    });

    unlocked.push({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      xpReward: def.xpReward,
      assetPath: def.assetPath,
    });
  }

  return unlocked;
}

// Exported so the Achievements page can show "progress toward unlock" for
// still-locked badges (e.g. "7 of 10 quizzes passed") without duplicating
// this per-criteria-kind logic.
export async function computeAchievementProgress(
  tx: Tx,
  userId: string,
  criteria: Criteria,
  ctx: AchievementContext,
): Promise<number> {
  switch (criteria.kind) {
    case "LESSON_COUNT":
      return tx.lessonProgress.count({ where: { userId, completedAt: { not: null } } });

    // Relies on MODULE_COMPLETED/COURSE_COMPLETED events, which are fired
    // going forward by lib/gamification/completion.ts and were backfilled
    // for already-completed modules/courses at launch (see
    // scripts/backfill-gamification-completions.ts) — an indexed count, not
    // a live recompute across every enrolled course on every check.
    case "MODULE_COUNT":
      return tx.userActivityEvent.count({ where: { userId, type: "MODULE_COMPLETED" } });
    case "COURSE_COUNT":
      return tx.userActivityEvent.count({ where: { userId, type: "COURSE_COMPLETED" } });

    case "QUIZ_PASS_COUNT":
      return (await tx.quizAttempt.groupBy({ by: ["quizId"], where: { userId, passed: true } })).length;
    case "QUIZ_PERFECT_COUNT":
      return (await tx.quizAttempt.groupBy({ by: ["quizId"], where: { userId, score: 100 } })).length;
    case "QUIZ_HIGH_SCORE_COUNT":
      return (await tx.quizAttempt.groupBy({ by: ["quizId"], where: { userId, score: { gte: 90 } } })).length;
    case "QUIZ_FIRST_ATTEMPT_HIGH":
      return isFirstAttemptHigh(tx, userId, ctx.quizId);

    case "STREAK_DAYS": {
      const profile = await tx.userGamificationProfile.findUnique({ where: { userId } });
      return profile?.longestStreak ?? 0;
    }
    case "LEARNING_HOURS": {
      const profile = await tx.userGamificationProfile.findUnique({ where: { userId } });
      return profile ? Math.floor(profile.totalLearningTimeSeconds / 3600) : 0;
    }

    // CONTRIBUTION_COUNT: non-deleted threads + answers + replies authored by
    // the user (soft-deleted rows excluded; hidden-but-not-deleted still count
    // as a contribution).
    case "CONTRIBUTION_COUNT": {
      const [threads, answers, replies] = await Promise.all([
        tx.discussionThread.count({ where: { authorId: userId, deletedAt: null } }),
        tx.discussionAnswer.count({ where: { authorId: userId, deletedAt: null } }),
        tx.discussionReply.count({ where: { authorId: userId, deletedAt: null } }),
      ]);
      return threads + answers + replies;
    }

    // HELPFUL_REACTIONS_COUNT: count of DiscussionReaction rows whose target
    // entity (thread/answer/reply) was authored by this user.
    case "HELPFUL_REACTIONS_COUNT": {
      const [threadIds, answerIds, replyIds] = await Promise.all([
        tx.discussionThread.findMany({ where: { authorId: userId }, select: { id: true } }),
        tx.discussionAnswer.findMany({ where: { authorId: userId }, select: { id: true } }),
        tx.discussionReply.findMany({ where: { authorId: userId }, select: { id: true } }),
      ]);
      const [threadLikes, answerLikes, replyLikes] = await Promise.all([
        threadIds.length
          ? tx.discussionReaction.count({
              where: { entityType: "THREAD", entityId: { in: threadIds.map((t) => t.id) } },
            })
          : 0,
        answerIds.length
          ? tx.discussionReaction.count({
              where: { entityType: "ANSWER", entityId: { in: answerIds.map((a) => a.id) } },
            })
          : 0,
        replyIds.length
          ? tx.discussionReaction.count({
              where: { entityType: "REPLY", entityId: { in: replyIds.map((r) => r.id) } },
            })
          : 0,
      ]);
      return threadLikes + answerLikes + replyLikes;
    }

    // HELPFUL_ANSWER_COUNT: answers by this user that were accepted.
    case "HELPFUL_ANSWER_COUNT":
      return tx.discussionAnswer.count({ where: { authorId: userId, isAccepted: true, deletedAt: null } });

    case "FAST_STARTER":
      return isFastStarter(tx, userId, criteria.withinHours ?? 24);
    case "WEEKEND_STREAK":
      return countConsecutiveQualifyingWeekends(tx, userId);
    case "NIGHT_SESSIONS":
      return countNightSessions(tx, userId, criteria.afterHour ?? 21);

    // Only ever awarded via the migration-time grandfather seed, never at runtime.
    case "EARLY_ADOPTER":
      return 0;

    default:
      return 0;
  }
}

async function isFirstAttemptHigh(tx: Tx, userId: string, quizId?: string): Promise<number> {
  if (quizId) {
    const firstAttempt = await tx.quizAttempt.findFirst({
      where: { userId, quizId },
      orderBy: { attemptedAt: "asc" },
    });
    return firstAttempt && firstAttempt.score >= 90 ? 1 : 0;
  }

  const attempts = await tx.quizAttempt.findMany({
    where: { userId },
    orderBy: { attemptedAt: "asc" },
    select: { quizId: true, score: true },
  });
  const seen = new Set<string>();
  for (const a of attempts) {
    if (seen.has(a.quizId)) continue;
    seen.add(a.quizId);
    if (a.score >= 90) return 1;
  }
  return 0;
}

async function isFastStarter(tx: Tx, userId: string, withinHours: number): Promise<number> {
  const [user, firstModuleEvent] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true } }),
    tx.userActivityEvent.findFirst({
      where: { userId, type: "MODULE_COMPLETED" },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!firstModuleEvent) return 0;
  const hoursElapsed = (firstModuleEvent.createdAt.getTime() - user.createdAt.getTime()) / 3_600_000;
  return hoursElapsed <= withinHours ? 1 : 0;
}

async function countConsecutiveQualifyingWeekends(tx: Tx, userId: string): Promise<number> {
  const days = await tx.userDailyLearningActivity.findMany({
    where: { userId, isQualifyingDay: true },
    select: { activityDate: true },
    orderBy: { activityDate: "asc" },
  });
  if (days.length === 0) return 0;

  const weekendKeys = new Set<string>();
  for (const d of days) {
    const [y, m, dd] = d.activityDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, dd));
    const dayOfWeek = date.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) continue;
    const saturday = new Date(date);
    if (dayOfWeek === 0) saturday.setUTCDate(saturday.getUTCDate() - 1);
    weekendKeys.add(saturday.toISOString().slice(0, 10));
  }
  if (weekendKeys.size === 0) return 0;

  const sortedKeys = [...weekendKeys].sort();
  let maxConsecutive = 1;
  let current = 1;
  for (let i = 1; i < sortedKeys.length; i++) {
    const diffDays =
      (new Date(sortedKeys[i]).getTime() - new Date(sortedKeys[i - 1]).getTime()) / 86_400_000;
    current = diffDays === 7 ? current + 1 : 1;
    maxConsecutive = Math.max(maxConsecutive, current);
  }
  return maxConsecutive;
}

async function countNightSessions(tx: Tx, userId: string, afterHour: number): Promise<number> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  const events = await tx.userActivityEvent.findMany({
    where: {
      userId,
      type: { in: ["LESSON_COMPLETED", "QUIZ_PASSED", "MODULE_COMPLETED", "COURSE_COMPLETED"] },
    },
    select: { createdAt: true },
  });

  const nightDateKeys = new Set<string>();
  for (const e of events) {
    const hour = getHourForUser(e.createdAt, user.timezone);
    if (hour >= afterHour || hour < 4) {
      nightDateKeys.add(getDateKeyForUser(e.createdAt, user.timezone));
    }
  }
  return nightDateKeys.size;
}

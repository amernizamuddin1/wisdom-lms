import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { GAMIFICATION_CONFIG } from "./config";
import { getDateKeyForUser } from "./timezone";
import { awardXp, awardQuizScoreTierXp, getRuleXpAmount } from "./xp";
import { recordQualifyingDay } from "./streaks";
import { checkModuleAndCourseCompletion } from "./completion";
import { maybeIssueCertificate } from "./certificates";
import { evaluateAchievements, type UnlockedAchievement } from "./achievements";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

export type GamificationResult = { newlyUnlockedAchievements: UnlockedAchievement[] };

async function bumpDailyActivity(
  tx: Tx,
  params: {
    userId: string;
    timezone: string;
    lessonsCompleted?: number;
    quizzesCompleted?: number;
    xpEarned?: number;
    learningTimeSeconds?: number;
    videoWatchTimeSeconds?: number;
  },
): Promise<{ becameQualifying: boolean }> {
  const tenantId = await getTenantId();

  const dateKey = getDateKeyForUser(new Date(), params.timezone);
  const key = { userId_activityDate: { userId: params.userId, activityDate: dateKey } };

  const existing = await tx.userDailyLearningActivity.findUnique({ where: key });
  const wasQualifying = existing?.isQualifyingDay ?? false;

  const updated = await tx.userDailyLearningActivity.upsert({
    where: key,
    create: {
      userId: params.userId,
      activityDate: dateKey,
      lessonsCompleted: params.lessonsCompleted ?? 0,
      quizzesCompleted: params.quizzesCompleted ?? 0,
      xpEarned: params.xpEarned ?? 0,
      learningTimeSeconds: params.learningTimeSeconds ?? 0,
      videoWatchTimeSeconds: params.videoWatchTimeSeconds ?? 0,
      tenantId,
    },
    update: {
      lessonsCompleted: { increment: params.lessonsCompleted ?? 0 },
      quizzesCompleted: { increment: params.quizzesCompleted ?? 0 },
      xpEarned: { increment: params.xpEarned ?? 0 },
      learningTimeSeconds: { increment: params.learningTimeSeconds ?? 0 },
      videoWatchTimeSeconds: { increment: params.videoWatchTimeSeconds ?? 0 },
    },
  });

  const nowQualifies =
    updated.lessonsCompleted >= 1 ||
    updated.quizzesCompleted >= 1 ||
    updated.learningTimeSeconds >= GAMIFICATION_CONFIG.streakQualifyingMinutes * 60;

  if (nowQualifies && !updated.isQualifyingDay) {
    await tx.userDailyLearningActivity.update({ where: { id: updated.id }, data: { isQualifyingDay: true } });
  }

  return { becameQualifying: nowQualifies && !wasQualifying };
}

export async function recordUserRegistered(tx: Tx, userId: string): Promise<void> {
  const tenantId = await getTenantId();
  await tx.userActivityEvent.create({ data: { userId, type: "USER_REGISTERED", xpAwarded: 0, tenantId } });
  await tx.userGamificationProfile.upsert({ where: { userId }, create: { userId, tenantId }, update: {} });
}

export async function recordProfileCompleted(tx: Tx, userId: string): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const amount = await getRuleXpAmount(tx, "PROFILE_COMPLETED");
  const result = await awardXp(tx, {
    userId,
    ruleCode: "PROFILE_COMPLETED",
    amount,
    reason: "Profile completed",
    dedupeKey: `PROFILE_COMPLETED:${userId}`,
  });
  await tx.userActivityEvent.create({
    data: { userId, type: "PROFILE_COMPLETED", xpAwarded: result.amount, tenantId },
  });
  return { newlyUnlockedAchievements: [] };
}

// The single entry point for "a lesson was just marked complete." Awards
// lesson XP (dedup-safe), updates today's daily activity + streak, checks
// whether this lesson completing also completes its module/course
// (cascading into certificate issuance), then evaluates only the achievement
// criteria kinds that could plausibly have just changed.
export async function recordLessonCompleted(
  tx: Tx,
  params: { userId: string; courseId: string; chapterId: string; lessonId: string },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId }, select: { timezone: true } });

  const amount = await getRuleXpAmount(tx, "LESSON_COMPLETED");
  const xpResult = await awardXp(tx, {
    userId: params.userId,
    ruleCode: "LESSON_COMPLETED",
    amount,
    reason: "Lesson completed",
    dedupeKey: `LESSON_COMPLETED:${params.lessonId}`,
    relatedEntityType: "LESSON",
    relatedEntityId: params.lessonId,
  });

  await tx.userActivityEvent.create({
    data: {
      userId: params.userId,
      type: "LESSON_COMPLETED",
      courseId: params.courseId,
      chapterId: params.chapterId,
      lessonId: params.lessonId,
      xpAwarded: xpResult.amount,
      tenantId,
    },
  });

  const relevantKinds: Parameters<typeof evaluateAchievements>[1]["relevantKinds"] = [];

  if (xpResult.awarded) {
    relevantKinds.push("LESSON_COUNT");
    const { becameQualifying } = await bumpDailyActivity(tx, {
      userId: params.userId,
      timezone: user.timezone,
      lessonsCompleted: 1,
      xpEarned: xpResult.amount,
    });
    if (becameQualifying) {
      const streakResult = await recordQualifyingDay(tx, { userId: params.userId, timezone: user.timezone });
      if (streakResult.milestonesCrossed.length > 0) relevantKinds.push("STREAK_DAYS", "WEEKEND_STREAK");
    }
  }

  const completion = await checkModuleAndCourseCompletion(tx, {
    userId: params.userId,
    courseId: params.courseId,
  });
  if (completion.newlyCompletedChapterIds.length > 0) relevantKinds.push("MODULE_COUNT", "FAST_STARTER");
  if (completion.courseNewlyCompleted) {
    relevantKinds.push("COURSE_COUNT");
    await maybeIssueCertificate(tx, { userId: params.userId, courseId: params.courseId });
  }

  if (relevantKinds.length === 0) return { newlyUnlockedAchievements: [] };
  const unlocked = await evaluateAchievements(tx, { userId: params.userId, relevantKinds });
  return { newlyUnlockedAchievements: unlocked };
}

// The single entry point for "a quiz attempt was just submitted." Always
// records QUIZ_COMPLETED; if passed, awards the score-tier XP delta (see
// awardQuizScoreTierXp — pass/90%+/100% form one ladder, never stacked),
// updates daily activity/streak, checks module/course completion, and
// evaluates the quiz-related achievement kinds.
export async function recordQuizAttempt(
  tx: Tx,
  params: {
    userId: string;
    courseId: string;
    chapterId: string | null;
    quizId: string;
    attemptId: string;
    score: number;
    passed: boolean;
  },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId }, select: { timezone: true } });

  await tx.userActivityEvent.create({
    data: {
      userId: params.userId,
      type: "QUIZ_COMPLETED",
      courseId: params.courseId,
      chapterId: params.chapterId ?? undefined,
      quizId: params.quizId,
      metadataJson: { score: params.score, passed: params.passed },
      tenantId,
    },
  });

  const relevantKinds: Parameters<typeof evaluateAchievements>[1]["relevantKinds"] = [];
  let becameQualifying = false;

  if (params.passed) {
    const tierResult = await awardQuizScoreTierXp(tx, {
      userId: params.userId,
      quizId: params.quizId,
      attemptId: params.attemptId,
      score: params.score,
      passed: params.passed,
    });

    const eventType =
      params.score >= 100 ? "QUIZ_PERFECT_SCORE" : params.score >= 90 ? "QUIZ_HIGH_SCORE" : "QUIZ_PASSED";
    await tx.userActivityEvent.create({
      data: {
        userId: params.userId,
        type: eventType,
        courseId: params.courseId,
        chapterId: params.chapterId ?? undefined,
        quizId: params.quizId,
        xpAwarded: tierResult.deltaAwarded,
        metadataJson: { score: params.score },
        tenantId,
      },
    });

    const dailyResult = await bumpDailyActivity(tx, {
      userId: params.userId,
      timezone: user.timezone,
      quizzesCompleted: 1,
      xpEarned: tierResult.deltaAwarded,
    });
    becameQualifying = dailyResult.becameQualifying;

    relevantKinds.push("QUIZ_PASS_COUNT", "QUIZ_FIRST_ATTEMPT_HIGH");
    if (params.score >= 90) relevantKinds.push("QUIZ_HIGH_SCORE_COUNT");
    if (params.score === 100) relevantKinds.push("QUIZ_PERFECT_COUNT");
  }

  if (becameQualifying) {
    const streakResult = await recordQualifyingDay(tx, { userId: params.userId, timezone: user.timezone });
    if (streakResult.milestonesCrossed.length > 0) relevantKinds.push("STREAK_DAYS", "WEEKEND_STREAK");
  }

  if (params.passed) {
    const completion = await checkModuleAndCourseCompletion(tx, {
      userId: params.userId,
      courseId: params.courseId,
    });
    if (completion.newlyCompletedChapterIds.length > 0) relevantKinds.push("MODULE_COUNT", "FAST_STARTER");
    if (completion.courseNewlyCompleted) {
      relevantKinds.push("COURSE_COUNT");
      await maybeIssueCertificate(tx, { userId: params.userId, courseId: params.courseId });
    }
  }

  if (relevantKinds.length === 0) return { newlyUnlockedAchievements: [] };
  const unlocked = await evaluateAchievements(tx, {
    userId: params.userId,
    relevantKinds,
    quizId: params.quizId,
  });
  return { newlyUnlockedAchievements: unlocked };
}

// The single entry point for the client learning-time heartbeat. Caps
// counted seconds per flush and per day (see GAMIFICATION_CONFIG) before
// persisting, so a tampered client clock or a stuck tab can't meaningfully
// inflate learning time.
export async function recordLearningHeartbeat(
  tx: Tx,
  params: { userId: string; courseId: string; lessonId: string; seconds: number; isVideo: boolean },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId }, select: { timezone: true } });
  const cappedSeconds = Math.max(0, Math.min(params.seconds, GAMIFICATION_CONFIG.maxSecondsPerHeartbeat));
  if (cappedSeconds <= 0) return { newlyUnlockedAchievements: [] };

  const dateKey = getDateKeyForUser(new Date(), user.timezone);
  const todayRow = await tx.userDailyLearningActivity.findUnique({
    where: { userId_activityDate: { userId: params.userId, activityDate: dateKey } },
  });
  const alreadyToday = todayRow?.learningTimeSeconds ?? 0;
  const allowedSeconds = Math.max(
    0,
    Math.min(cappedSeconds, GAMIFICATION_CONFIG.maxLearningSecondsPerDay - alreadyToday),
  );
  if (allowedSeconds <= 0) return { newlyUnlockedAchievements: [] };

  const { becameQualifying } = await bumpDailyActivity(tx, {
    userId: params.userId,
    timezone: user.timezone,
    learningTimeSeconds: allowedSeconds,
    videoWatchTimeSeconds: params.isVideo ? allowedSeconds : 0,
  });

  await tx.userGamificationProfile.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      totalLearningTimeSeconds: allowedSeconds,
      totalVideoWatchTimeSeconds: params.isVideo ? allowedSeconds : 0,
      tenantId,
    },
    update: {
      totalLearningTimeSeconds: { increment: allowedSeconds },
      totalVideoWatchTimeSeconds: { increment: params.isVideo ? allowedSeconds : 0 },
    },
  });

  // Separate from the daily-activity table above (which stays user-day
  // grained, the correct shape for streaks/the heatmap) — this is the
  // per-course running total Analytics Section E needs.
  await tx.userCourseLearningTime.upsert({
    where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
    create: {
      userId: params.userId,
      courseId: params.courseId,
      learningTimeSeconds: allowedSeconds,
      videoWatchTimeSeconds: params.isVideo ? allowedSeconds : 0,
      tenantId,
    },
    update: {
      learningTimeSeconds: { increment: allowedSeconds },
      videoWatchTimeSeconds: { increment: params.isVideo ? allowedSeconds : 0 },
      lastActivityAt: new Date(),
    },
  });

  const relevantKinds: Parameters<typeof evaluateAchievements>[1]["relevantKinds"] = ["LEARNING_HOURS"];

  if (becameQualifying) {
    const streakResult = await recordQualifyingDay(tx, { userId: params.userId, timezone: user.timezone });
    if (streakResult.milestonesCrossed.length > 0) relevantKinds.push("STREAK_DAYS", "WEEKEND_STREAK");
  }

  const unlocked = await evaluateAchievements(tx, { userId: params.userId, relevantKinds });
  return { newlyUnlockedAchievements: unlocked };
}

// ── Community / Discussion Board ────────────────────────────────────────
// Wires the previously-dormant DISCUSSION_* XpRule rows + Community
// AchievementDefinition rows into real user actions. The 40-char minimum
// content-length gate lives in lib/community/{threads,answers,replies}.ts
// (mirroring XpRule.qualifyingConditionJson's minContentLength, not
// duplicating it as separate logic) — these functions assume the caller
// already decided the post qualifies before calling.

async function awardFirstPostBonusIfEligible(tx: Tx, userId: string): Promise<number> {
  const amount = await getRuleXpAmount(tx, "DISCUSSION_FIRST_POST");
  const result = await awardXp(tx, {
    userId,
    ruleCode: "DISCUSSION_FIRST_POST",
    amount,
    reason: "First community post",
    dedupeKey: `DISCUSSION_FIRST_POST:${userId}`,
  });
  return result.awarded ? result.amount : 0;
}

// Fires for a qualifying (>= 40 char) new thread. Also fires the one-time
// DISCUSSION_FIRST_POST bonus (idempotent via its own dedupeKey keyed only
// on userId), so both can be awarded from the user's very first post.
export async function recordDiscussionPostCreated(
  tx: Tx,
  params: { userId: string; threadId: string },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const amount = await getRuleXpAmount(tx, "DISCUSSION_POST");
  const postResult = await awardXp(tx, {
    userId: params.userId,
    ruleCode: "DISCUSSION_POST",
    amount,
    reason: "Discussion post created",
    dedupeKey: `DISCUSSION_POST:${params.threadId}`,
    relatedEntityType: "DISCUSSION_THREAD",
    relatedEntityId: params.threadId,
  });
  const bonusAmount = await awardFirstPostBonusIfEligible(tx, params.userId);

  await tx.userActivityEvent.create({
    data: {
      userId: params.userId,
      type: "DISCUSSION_POST_CREATED",
      xpAwarded: postResult.amount + bonusAmount,
      metadataJson: { threadId: params.threadId },
      tenantId,
    },
  });

  const unlocked = await evaluateAchievements(tx, {
    userId: params.userId,
    relevantKinds: ["CONTRIBUTION_COUNT"],
  });
  return { newlyUnlockedAchievements: unlocked };
}

// Fires for a qualifying (>= 40 char) new answer or reply. entityId is the
// answer or reply id — the dedupe key is content-independent (keyed on id,
// not content hash), so delete-and-repost farming is instead bounded by the
// DISCUSSION_REPLY daily cap (5/day), the intended defense per plan section 11.
export async function recordDiscussionReplyCreated(
  tx: Tx,
  params: { userId: string; entityId: string },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const amount = await getRuleXpAmount(tx, "DISCUSSION_REPLY");
  const replyResult = await awardXp(tx, {
    userId: params.userId,
    ruleCode: "DISCUSSION_REPLY",
    amount,
    reason: "Discussion reply created",
    dedupeKey: `DISCUSSION_REPLY:${params.entityId}`,
    relatedEntityType: "DISCUSSION_REPLY",
    relatedEntityId: params.entityId,
  });
  const bonusAmount = await awardFirstPostBonusIfEligible(tx, params.userId);

  await tx.userActivityEvent.create({
    data: {
      userId: params.userId,
      type: "DISCUSSION_REPLY_CREATED",
      xpAwarded: replyResult.amount + bonusAmount,
      metadataJson: { entityId: params.entityId },
      tenantId,
    },
  });

  const unlocked = await evaluateAchievements(tx, {
    userId: params.userId,
    relevantKinds: ["CONTRIBUTION_COUNT"],
  });
  return { newlyUnlockedAchievements: unlocked };
}

// Fires when someone likes recipientUserId's thread/answer/reply. Dedupe key
// includes the liker so distinct likers each pay once, but the same liker
// unliking then re-liking hits the same key and is silently ignored.
export async function recordDiscussionReactionReceived(
  tx: Tx,
  params: { recipientUserId: string; likerUserId: string; entityType: string; entityId: string },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const amount = await getRuleXpAmount(tx, "DISCUSSION_HELPFUL_REACTION_RECEIVED");
  const result = await awardXp(tx, {
    userId: params.recipientUserId,
    ruleCode: "DISCUSSION_HELPFUL_REACTION_RECEIVED",
    amount,
    reason: "Received a helpful reaction",
    dedupeKey: `DISCUSSION_HELPFUL_REACTION_RECEIVED:${params.entityType}:${params.entityId}:${params.likerUserId}`,
    relatedEntityType: params.entityType,
    relatedEntityId: params.entityId,
  });

  await tx.userActivityEvent.create({
    data: {
      userId: params.recipientUserId,
      type: "DISCUSSION_REACTION_RECEIVED",
      xpAwarded: result.amount,
      metadataJson: { entityType: params.entityType, entityId: params.entityId, likerUserId: params.likerUserId },
      tenantId,
    },
  });

  const unlocked = await evaluateAchievements(tx, {
    userId: params.recipientUserId,
    relevantKinds: ["HELPFUL_REACTIONS_COUNT"],
  });
  return { newlyUnlockedAchievements: unlocked };
}

// Fires when the question author accepts an answer. Dedupe key is keyed on
// answerId only, so accept -> unaccept -> accept-a-different-answer never
// double-pays (each answer has its own key).
export async function recordDiscussionAnswerAccepted(
  tx: Tx,
  params: { userId: string; answerId: string },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const amount = await getRuleXpAmount(tx, "DISCUSSION_ANSWER_ACCEPTED");
  const result = await awardXp(tx, {
    userId: params.userId,
    ruleCode: "DISCUSSION_ANSWER_ACCEPTED",
    amount,
    reason: "Answer accepted",
    dedupeKey: `DISCUSSION_ANSWER_ACCEPTED:${params.answerId}`,
    relatedEntityType: "DISCUSSION_ANSWER",
    relatedEntityId: params.answerId,
  });

  await tx.userActivityEvent.create({
    data: {
      userId: params.userId,
      type: "DISCUSSION_ANSWER_ACCEPTED",
      xpAwarded: result.amount,
      metadataJson: { answerId: params.answerId },
      tenantId,
    },
  });

  const unlocked = await evaluateAchievements(tx, {
    userId: params.userId,
    relevantKinds: ["HELPFUL_ANSWER_COUNT"],
  });
  return { newlyUnlockedAchievements: unlocked };
}

// Marks an answer "helpful" via an explicit, non-accept signal (reserved for
// a future dedicated UI control — see plan's gamification wiring summary).
// Kept distinct from acceptance so a course/thread can reward multiple
// helpful answers, not just the single accepted one.
export async function recordDiscussionAnswerMarkedHelpful(
  tx: Tx,
  params: { userId: string; answerId: string },
): Promise<GamificationResult> {
  const tenantId = await getTenantId();
  const amount = await getRuleXpAmount(tx, "DISCUSSION_ANSWER_HELPFUL");
  const result = await awardXp(tx, {
    userId: params.userId,
    ruleCode: "DISCUSSION_ANSWER_HELPFUL",
    amount,
    reason: "Answer marked helpful",
    dedupeKey: `DISCUSSION_ANSWER_HELPFUL:${params.answerId}`,
    relatedEntityType: "DISCUSSION_ANSWER",
    relatedEntityId: params.answerId,
  });

  await tx.userActivityEvent.create({
    data: {
      userId: params.userId,
      type: "DISCUSSION_ANSWER_MARKED_HELPFUL",
      xpAwarded: result.amount,
      metadataJson: { answerId: params.answerId },
      tenantId,
    },
  });

  const unlocked = await evaluateAchievements(tx, {
    userId: params.userId,
    relevantKinds: ["HELPFUL_ANSWER_COUNT"],
  });
  return { newlyUnlockedAchievements: unlocked };
}

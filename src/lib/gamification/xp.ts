import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { getDateKeyForUser } from "./timezone";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

export type AwardXpParams = {
  userId: string;
  ruleCode: string;
  amount: number;
  reason: string;
  dedupeKey?: string;
  sourceEventId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
};

export type AwardXpResult = { awarded: boolean; amount: number };

function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Looks up a rule's current XP amount, respecting its active flag — the one
// place every call site should read "how much is this rule worth right now"
// from, so a future admin toggling a rule off (Phase 4) is honored uniformly.
export async function getRuleXpAmount(tx: Tx, ruleCode: string): Promise<number> {
  const rule = await tx.xpRule.findUnique({ where: { code: ruleCode } });
  return rule?.isActive ? rule.xpAmount : 0;
}

async function isUnderDailyCap(tx: Tx, userId: string, ruleCode: string, cap: number): Promise<boolean> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  const dateKey = getDateKeyForUser(new Date(), user.timezone);
  const dayStart = fromZonedTime(`${dateKey}T00:00:00`, user.timezone);
  const dayEnd = fromZonedTime(`${dateKey}T23:59:59.999`, user.timezone);

  const count = await tx.userXpTransaction.count({
    where: { userId, ruleCode, isReversed: false, createdAt: { gte: dayStart, lte: dayEnd } },
  });
  return count < cap;
}

// Dedupe-safe XP ledger write. Attempts the insert; if `dedupeKey` collides
// with an existing entry for this user (P2002), the action has already been
// awarded and this is a no-op re-trigger (e.g. reopening a completed lesson).
// Respects the rule's active flag and daily cap, both read fresh so an admin
// toggling a rule off (Phase 4) takes effect immediately.
export async function awardXp(tx: Tx, params: AwardXpParams): Promise<AwardXpResult> {
  if (params.amount <= 0) return { awarded: false, amount: 0 };

  const tenantId = await getTenantId();
  const rule = await tx.xpRule.findUnique({ where: { code: params.ruleCode } });
  if (rule && !rule.isActive) return { awarded: false, amount: 0 };
  if (rule?.dailyCap != null) {
    const under = await isUnderDailyCap(tx, params.userId, params.ruleCode, rule.dailyCap);
    if (!under) return { awarded: false, amount: 0 };
  }

  try {
    await tx.userXpTransaction.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        reason: params.reason,
        ruleCode: params.ruleCode,
        dedupeKey: params.dedupeKey,
        sourceEventId: params.sourceEventId,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        metadataJson: params.metadata as Prisma.InputJsonValue | undefined,
        tenantId,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) return { awarded: false, amount: 0 };
    throw e;
  }

  await tx.userGamificationProfile.upsert({
    where: { userId: params.userId },
    create: { userId: params.userId, totalXp: params.amount, tenantId },
    update: { totalXp: { increment: params.amount } },
  });

  return { awarded: true, amount: params.amount };
}

// Admin-initiated reversal (Phase 4 manual adjustment UI). Marks the ledger
// entry reversed (never deleted — the ledger is an audit trail) and
// decrements the cached total. No-ops if already reversed.
export async function reverseXp(
  tx: Tx,
  params: { transactionId: string; reason: string; adminId?: string },
): Promise<void> {
  const txn = await tx.userXpTransaction.findUniqueOrThrow({ where: { id: params.transactionId } });
  if (txn.isReversed) return;

  await tx.userXpTransaction.update({
    where: { id: txn.id },
    data: {
      isReversed: true,
      reversedAt: new Date(),
      reversedById: params.adminId,
      reversalReason: params.reason,
    },
  });

  await tx.userGamificationProfile.update({
    where: { userId: txn.userId },
    data: { totalXp: { decrement: txn.amount } },
  });
}

// Sum of the highest tierValue ever recorded for this user+quiz's score-tier
// top-ups — the "best tier credited so far," read back from ledger metadata
// rather than a separate tracking column (the ledger stays self-sufficient).
async function getBestQuizTierValue(tx: Tx, userId: string, quizId: string): Promise<number> {
  const rows = await tx.userXpTransaction.findMany({
    where: {
      userId,
      relatedEntityType: "QUIZ",
      relatedEntityId: quizId,
      dedupeKey: { startsWith: `QUIZ_SCORE_TIER:${quizId}:` },
      isReversed: false,
    },
    select: { metadataJson: true },
  });

  let best = 0;
  for (const row of rows) {
    const meta = row.metadataJson as { tierValue?: number } | null;
    if (meta?.tierValue && meta.tierValue > best) best = meta.tierValue;
  }
  return best;
}

// Quiz score-tier XP is a single ladder (pass < 90%+ < 100%), never stacked:
// total XP ever paid for one quiz is capped at the value of the best tier
// reached, and each attempt pays only the delta above the best tier
// previously credited. A direct 100% first attempt pays the perfect-score
// amount once; a pass-then-improve sequence pays each tier's incremental
// difference as it's crossed.
export async function awardQuizScoreTierXp(
  tx: Tx,
  params: { userId: string; quizId: string; attemptId: string; score: number; passed: boolean },
): Promise<{ tierValue: number; deltaAwarded: number }> {
  if (!params.passed) return { tierValue: 0, deltaAwarded: 0 };

  const [passRule, highRule, perfectRule] = await Promise.all([
    tx.xpRule.findUnique({ where: { code: "QUIZ_PASSED" } }),
    tx.xpRule.findUnique({ where: { code: "QUIZ_HIGH_SCORE" } }),
    tx.xpRule.findUnique({ where: { code: "QUIZ_PERFECT_SCORE" } }),
  ]);

  let tierValue = passRule?.isActive ? passRule.xpAmount : 0;
  let ruleCode = "QUIZ_PASSED";
  if (params.score >= 100 && perfectRule?.isActive) {
    tierValue = perfectRule.xpAmount;
    ruleCode = "QUIZ_PERFECT_SCORE";
  } else if (params.score >= 90 && highRule?.isActive) {
    tierValue = highRule.xpAmount;
    ruleCode = "QUIZ_HIGH_SCORE";
  }

  const priorBest = await getBestQuizTierValue(tx, params.userId, params.quizId);
  const delta = tierValue - priorBest;
  if (delta <= 0) return { tierValue, deltaAwarded: 0 };

  const result = await awardXp(tx, {
    userId: params.userId,
    ruleCode,
    amount: delta,
    reason: `Quiz score tier reached (${ruleCode})`,
    dedupeKey: `QUIZ_SCORE_TIER:${params.quizId}:${params.attemptId}`,
    relatedEntityType: "QUIZ",
    relatedEntityId: params.quizId,
    metadata: { tierValue, score: params.score },
  });

  return { tierValue, deltaAwarded: result.awarded ? delta : 0 };
}

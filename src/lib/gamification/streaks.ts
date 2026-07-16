import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDateKeyForUser, previousDateKey } from "./timezone";
import { computeStreakUpdate, type StreakUpdateResult } from "./streaks-pure";
import { getTenantId } from "@/lib/tenant-context";

export type { StreakUpdateResult };

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

// Called whenever today's UserDailyLearningActivity row newly becomes
// qualifying (a lesson/quiz completed, or the learning-time threshold
// crossed). Idempotent for the same day.
export async function recordQualifyingDay(
  tx: Tx,
  params: { userId: string; timezone: string; now?: Date },
): Promise<StreakUpdateResult> {
  const now = params.now ?? new Date();
  const todayKey = getDateKeyForUser(now, params.timezone);
  const yesterdayKey = previousDateKey(todayKey);

  const tenantId = await getTenantId();

  const profile = await tx.userGamificationProfile.upsert({
    where: { userId: params.userId },
    create: { userId: params.userId, tenantId },
    update: {},
  });

  const result = computeStreakUpdate({
    lastQualifyingDate: profile.lastQualifyingDate,
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
    todayKey,
    yesterdayKey,
  });

  if (result.isNewDay) {
    await tx.userGamificationProfile.update({
      where: { userId: params.userId },
      data: {
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        lastQualifyingDate: todayKey,
        totalActiveDays: { increment: 1 },
      },
    });
  }

  return result;
}

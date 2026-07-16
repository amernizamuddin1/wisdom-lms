import "server-only";
import { prisma } from "@/lib/prisma";
import { getLevelProgress } from "./levels";
import { getDateKeyForUser } from "./timezone";

// Deterministic, cheap, priority-ordered checks — not an exhaustive scan of
// every achievement's progress (that would mean recomputing all 32 badge
// criteria on every dashboard/analytics load). Covers the two most common
// "what should I do next" cases: close to leveling up, or haven't logged a
// qualifying day yet today.
export async function getNextMilestone(userId: string): Promise<string> {
  const [profile, user] = await Promise.all([
    prisma.userGamificationProfile.findUnique({ where: { userId } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
  ]);

  const totalXp = profile?.totalXp ?? 0;
  const levelProgress = await getLevelProgress(prisma, totalXp);

  if (levelProgress?.nextLevel && levelProgress.xpForNextLevel != null) {
    const xpRemaining = levelProgress.xpForNextLevel - levelProgress.xpIntoLevel;
    if (xpRemaining > 0 && xpRemaining <= 200) {
      return `Earn ${xpRemaining} more XP to reach ${levelProgress.nextLevel.name}.`;
    }
  }

  const todayKey = getDateKeyForUser(new Date(), user.timezone);
  if (profile?.lastQualifyingDate !== todayKey) {
    return profile && profile.currentStreak > 0
      ? "Learn today to keep your streak alive."
      : "Complete a lesson today to start your learning streak.";
  }

  return "Keep going — your next achievement is closer than you think.";
}

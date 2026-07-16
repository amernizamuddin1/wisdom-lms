"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UnviewedAchievement = {
  id: string;
  achievementId: string;
  name: string;
  description: string;
  category: string;
  xpReward: number;
  assetPath: string;
};

// Backs the unlock-modal watcher (UnlockWatcher.tsx). viewedAt stays null
// until acknowledged, so the same unlock never reappears across page loads
// or devices — persisted, not client-side-only memory.
export async function getUnviewedAchievements(): Promise<UnviewedAchievement[]> {
  const user = await requireUser();
  const rows = await prisma.userAchievement.findMany({
    where: { userId: user.id, viewedAt: null },
    include: { achievement: true },
    orderBy: { earnedAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    achievementId: r.achievementId,
    name: r.achievement.name,
    description: r.achievement.description,
    category: r.achievement.category,
    xpReward: r.achievement.xpReward,
    assetPath: r.achievement.assetPath,
  }));
}

export async function markAchievementViewed(userAchievementId: string): Promise<void> {
  const user = await requireUser();
  await prisma.userAchievement.updateMany({
    where: { id: userAchievementId, userId: user.id, viewedAt: null },
    data: { viewedAt: new Date() },
  });
}

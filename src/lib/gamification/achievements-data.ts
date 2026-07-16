import "server-only";
import { prisma } from "@/lib/prisma";
import { computeAchievementProgress, type Criteria } from "./achievements";

export type AchievementCardData = {
  id: string;
  name: string;
  description: string;
  category: string;
  assetPath: string;
  isHidden: boolean;
  xpReward: number;
  earned: boolean;
  earnedAt: Date | null;
  progressCurrent: number | null;
  progressThreshold: number | null;
};

// Read-only progress computation for every not-yet-earned badge — run in
// parallel (no transactional consistency needed between them, this is just
// a display of current progress, not a mutation) so the Achievements page
// stays fast even across the full 32-badge catalogue.
export async function getAchievementsPageData(userId: string): Promise<AchievementCardData[]> {
  const [definitions, earnedRows] = await Promise.all([
    prisma.achievementDefinition.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId } }),
  ]);

  const earnedByAchievementId = new Map(earnedRows.map((e) => [e.achievementId, e]));

  return Promise.all(
    definitions.map(async (def) => {
      const earned = earnedByAchievementId.get(def.id);
      const criteria = def.unlockCriteriaJson as Criteria;

      const progressCurrent = earned
        ? null
        : await computeAchievementProgress(prisma, userId, criteria, { userId, relevantKinds: [criteria.kind] });

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        assetPath: def.assetPath,
        isHidden: def.isHidden,
        xpReward: def.xpReward,
        earned: !!earned,
        earnedAt: earned?.earnedAt ?? null,
        progressCurrent,
        progressThreshold: criteria.threshold ?? 1,
      };
    }),
  );
}

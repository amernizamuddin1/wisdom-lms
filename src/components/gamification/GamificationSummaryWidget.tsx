import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeLevelProgress } from "@/lib/gamification/levels-pure";
import { getDateKeyForUser } from "@/lib/gamification/timezone";
import { formatNumber } from "@/lib/gamification/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BadgeImage from "./BadgeImage";

// Compact — the full picture lives on the dedicated Analytics/Achievements
// pages (Part 18: "Do not overcrowd the dashboard"). Weekly leaderboard rank
// is intentionally omitted here — the leaderboard is a later-phase feature,
// and showing a fake rank would violate the no-mock-data requirement.
export default async function GamificationSummaryWidget({ userId }: { userId: string }) {
  const [profile, mostRecentBadge, user, levels] = await Promise.all([
    prisma.userGamificationProfile.findUnique({ where: { userId } }),
    prisma.userAchievement.findFirst({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      include: { achievement: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
    prisma.gamificationLevel.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const totalXp = profile?.totalXp ?? 0;
  const levelProgress = computeLevelProgress(levels, totalXp);
  let nextMilestone = "Keep going — your next achievement is closer than you think.";

  if (levelProgress?.nextLevel && levelProgress.xpForNextLevel != null) {
    const xpRemaining = levelProgress.xpForNextLevel - levelProgress.xpIntoLevel;
    if (xpRemaining > 0 && xpRemaining <= 200) {
      nextMilestone = `Earn ${xpRemaining} more XP to reach ${levelProgress.nextLevel.name}.`;
    }
  }

  if (nextMilestone.startsWith("Keep going")) {
    const todayKey = getDateKeyForUser(new Date(), user.timezone);
    if (profile?.lastQualifyingDate !== todayKey) {
      nextMilestone =
        profile && profile.currentStreak > 0
          ? "Learn today to keep your streak alive."
          : "Complete a lesson today to start your learning streak.";
    }
  }

  return (
    <Card variant="subtle">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="font-semibold text-foreground">{levelProgress?.currentLevel.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">XP</p>
            <p className="font-semibold text-foreground">{formatNumber(totalXp)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Streak</p>
            <p className="font-semibold text-foreground">{profile?.currentStreak ?? 0}d</p>
          </div>
          {mostRecentBadge && (
            <div className="flex items-center gap-2">
              <BadgeImage
                assetPath={mostRecentBadge.achievement.assetPath}
                alt={mostRecentBadge.achievement.name}
                size={32}
                locked={false}
              />
              <div>
                <p className="text-xs text-muted-foreground">Latest badge</p>
                <p className="text-sm font-medium text-foreground">{mostRecentBadge.achievement.name}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="max-w-xs text-sm text-muted-foreground">{nextMilestone}</p>
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/analytics">View Analytics</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

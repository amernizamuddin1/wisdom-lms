import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLevelProgress } from "@/lib/gamification/levels";
import { getNextMilestone } from "@/lib/gamification/next-milestone";
import { formatNumber } from "@/lib/gamification/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BadgeImage from "./BadgeImage";

// Compact — the full picture lives on the dedicated Analytics/Achievements
// pages (Part 18: "Do not overcrowd the dashboard"). Weekly leaderboard rank
// is intentionally omitted here — the leaderboard is a later-phase feature,
// and showing a fake rank would violate the no-mock-data requirement.
export default async function GamificationSummaryWidget({ userId }: { userId: string }) {
  const [profile, mostRecentBadge, nextMilestone] = await Promise.all([
    prisma.userGamificationProfile.findUnique({ where: { userId } }),
    prisma.userAchievement.findFirst({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      include: { achievement: true },
    }),
    getNextMilestone(userId),
  ]);

  const totalXp = profile?.totalXp ?? 0;
  const levelProgress = await getLevelProgress(prisma, totalXp);

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
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/analytics">View Analytics</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

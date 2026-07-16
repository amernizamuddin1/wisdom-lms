import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/gamification/format";
import type { LevelProgress } from "@/lib/gamification/levels";

export default function LevelProgressCard({ levelProgress }: { levelProgress: LevelProgress | null }) {
  if (!levelProgress) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Levels aren&apos;t configured yet.
        </CardContent>
      </Card>
    );
  }

  const { currentLevel, nextLevel, currentXp, xpIntoLevel, xpForNextLevel, progressPercent } = levelProgress;

  return (
    <Card variant="subtle">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">{currentLevel.name}</h3>
          <span className="text-sm text-muted-foreground">{formatNumber(currentXp)} XP total</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {nextLevel && xpForNextLevel != null ? (
          <p className="text-sm text-muted-foreground">
            {formatNumber(xpIntoLevel)} / {formatNumber(xpForNextLevel)} XP —{" "}
            {formatNumber(Math.max(0, xpForNextLevel - xpIntoLevel))} XP to reach {nextLevel.name}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">You&apos;ve reached the highest level.</p>
        )}
      </CardContent>
    </Card>
  );
}

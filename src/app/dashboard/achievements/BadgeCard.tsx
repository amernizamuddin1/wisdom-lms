import BadgeImage from "@/components/gamification/BadgeImage";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AchievementCardData } from "@/lib/gamification/achievements-data";

function progressLabel(card: AchievementCardData): string | null {
  if (card.earned || card.progressCurrent == null || card.progressThreshold == null) return null;

  // Streak-based badges read better as "current best" than "N of M" — it's
  // the same underlying longestStreak value, just framed the way the spec's
  // example UI copy expects ("Current best: 18 days").
  if (card.description.toLowerCase().includes("streak")) {
    return `Current best: ${card.progressCurrent} of ${card.progressThreshold} days`;
  }
  return `Progress: ${card.progressCurrent} of ${card.progressThreshold}`;
}

export default function BadgeCard({ card }: { card: AchievementCardData }) {
  const isMysteryLocked = card.isHidden && !card.earned;
  const progress = progressLabel(card);
  const percent = card.progressCurrent != null && card.progressThreshold
    ? Math.min(100, Math.round((card.progressCurrent / card.progressThreshold) * 100))
    : card.earned
      ? 100
      : 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 p-4 text-center",
        cardVariants({ variant: "subtle" }),
        !card.earned && "bg-muted/30",
      )}
    >
      <BadgeImage
        assetPath={card.assetPath}
        alt={isMysteryLocked ? "Hidden achievement" : card.name}
        size={64}
        locked={!card.earned}
      />

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{isMysteryLocked ? "Hidden Achievement" : card.name}</p>
        <p className="text-xs text-muted-foreground">
          {isMysteryLocked ? "Keep learning to reveal this achievement." : card.description}
        </p>
      </div>

      {card.earned && card.earnedAt ? (
        <p className="text-xs font-medium text-success">Earned {card.earnedAt.toLocaleDateString()}</p>
      ) : (
        !isMysteryLocked &&
        progress && (
          <div className="w-full space-y-1">
            <div className="h-1 overflow-hidden rounded-full bg-surface-tertiary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{progress}</p>
          </div>
        )
      )}
    </div>
  );
}

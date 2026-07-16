import { requireUser } from "@/lib/auth";
import { getAchievementsPageData } from "@/lib/gamification/achievements-data";
import { Card, CardContent } from "@/components/ui/card";
import BadgeCard from "./BadgeCard";

const CATEGORY_ORDER = ["LEARNING", "MASTERY", "CONSISTENCY", "COMMUNITY", "LEARNING_TIME", "SPECIAL"] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  LEARNING: "Learning",
  MASTERY: "Mastery",
  CONSISTENCY: "Consistency",
  COMMUNITY: "Community",
  LEARNING_TIME: "Learning Time",
  SPECIAL: "Special Achievements",
};

export default async function AchievementsPage() {
  const user = await requireUser();
  const cards = await getAchievementsPageData(user.id);

  const totalEarned = cards.filter((c) => c.earned).length;
  const totalAvailable = cards.filter((c) => !c.isHidden || c.earned).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Achievements</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalEarned}</span> of {totalAvailable} earned
        </p>
      </div>

      {totalEarned === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Your first achievement is closer than you think. Complete a lesson to get started.
          </CardContent>
        </Card>
      )}

      {CATEGORY_ORDER.map((category) => {
        const categoryCards = cards.filter((c) => c.category === category);
        if (categoryCards.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h3 className="font-semibold text-foreground">{CATEGORY_LABELS[category]}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {categoryCards.map((card) => (
                <BadgeCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

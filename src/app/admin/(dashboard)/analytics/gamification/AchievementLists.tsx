import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AchievementStat } from "@/lib/analytics/gamification-analytics";

function AchievementRow({ stat }: { stat: AchievementStat }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{stat.name}</p>
        <p className="text-xs text-muted-foreground">{stat.earnedCount.toLocaleString()} learners earned this</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-muted-foreground">{stat.percentOfAllLearners}% of all learners</span>
    </li>
  );
}

export default function AchievementLists({ mostEarned, rarest }: { mostEarned: AchievementStat[]; rarest: AchievementStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Most Earned Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          {mostEarned.length === 0 ? (
            <p className="text-sm text-muted-foreground">No achievements unlocked yet.</p>
          ) : (
            <ul className="space-y-2">
              {mostEarned.map((s) => (
                <AchievementRow key={s.id} stat={s} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rarest Achievements</CardTitle>
          <p className="text-xs text-muted-foreground">Percentage is of all learners, not eligible learners — eligibility criteria vary per achievement.</p>
        </CardHeader>
        <CardContent>
          {rarest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No achievements unlocked yet.</p>
          ) : (
            <ul className="space-y-2">
              {rarest.map((s) => (
                <AchievementRow key={s.id} stat={s} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

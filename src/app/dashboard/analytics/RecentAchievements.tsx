import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BadgeImage from "@/components/gamification/BadgeImage";

export type RecentAchievement = {
  id: string;
  name: string;
  assetPath: string;
  earnedAt: Date;
};

export default function RecentAchievements({ achievements }: { achievements: RecentAchievement[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Achievements</CardTitle>
        <Link href="/dashboard/achievements" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your first achievement is closer than you think. Complete a lesson to get started.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {achievements.map((a) => (
              <div key={a.id} className="flex w-20 flex-col items-center gap-1.5 text-center">
                <BadgeImage assetPath={a.assetPath} alt={a.name} size={56} locked={false} />
                <p className="text-xs font-medium text-foreground">{a.name}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

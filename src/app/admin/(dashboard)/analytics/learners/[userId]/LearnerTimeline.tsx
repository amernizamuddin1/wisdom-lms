import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryIcon } from "lucide-react";
import type { TimelineEvent } from "@/lib/analytics/learners";

export default function LearnerTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="No activity yet" description="This learner hasn't recorded any activity events." />
        ) : (
          <ol className="space-y-4">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-medium text-foreground">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{e.createdAt.toLocaleString()}</p>
                  </div>
                  {e.xpAwarded > 0 && <p className="text-xs text-primary">+{e.xpAwarded} XP</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

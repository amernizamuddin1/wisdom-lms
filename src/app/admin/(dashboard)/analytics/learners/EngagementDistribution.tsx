import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EngagementSegment } from "@/lib/analytics/learner-segments";

const SEGMENT_COLORS: Record<EngagementSegment, string> = {
  HIGHLY_ENGAGED: "bg-success",
  ACTIVE: "bg-primary",
  SLOWING_DOWN: "bg-warning",
  AT_RISK: "bg-destructive",
  DORMANT: "bg-muted-foreground/40",
};

export default function EngagementDistribution({
  data,
  activeSegment,
}: {
  data: { segment: EngagementSegment; label: string; count: number }[];
  activeSegment: string | undefined;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.count, 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learner Engagement Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((d) => {
          const isActive = activeSegment === d.segment;
          const widthPercent = Math.max(3, Math.round((d.count / total) * 100));
          return (
            <Link
              key={d.segment}
              href={isActive ? "/admin/analytics/learners" : `/admin/analytics/learners?segment=${d.segment}`}
              className={cn(
                "block rounded-md border border-transparent px-1.5 py-1 transition-colors hover:border-primary/50 hover:bg-muted/30",
                isActive && "border-primary/50 bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <span className={cn("size-2.5 rounded-full", SEGMENT_COLORS[d.segment])} />
                  {d.label}
                </span>
                <span className="text-muted-foreground">
                  {d.count.toLocaleString()} ({Math.round((d.count / total) * 100)}%)
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", SEGMENT_COLORS[d.segment])} style={{ width: `${widthPercent}%` }} />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

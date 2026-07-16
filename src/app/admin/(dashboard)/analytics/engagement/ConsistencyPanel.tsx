import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConsistencyMetrics } from "@/lib/analytics/consistency";

export default function ConsistencyPanel({ metrics }: { metrics: ConsistencyMetrics }) {
  const totalLearners = Math.max(1, metrics.distribution.reduce((s, d) => s + d.count, 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Consistency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Avg. active days" value={metrics.averageActiveDays} />
          <Stat label="Median active days" value={metrics.medianActiveDays} />
          <Stat label="Avg. days between sessions" value={metrics.averageDaysBetweenSessions ?? "—"} />
          <Stat label="Return within 7d" value={`${metrics.returnWithin7DaysPercent}%`} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Active days distribution</p>
          {metrics.distribution.map((d) => {
            const widthPercent = Math.max(2, Math.round((d.count / totalLearners) * 100));
            return (
              <div key={d.bucket} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">{d.bucket} day{d.bucket === "1" ? "" : "s"}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${widthPercent}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-muted-foreground">{d.count}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">{metrics.returnWithin30DaysPercent}% of learners with 2+ active days returned within 30 days of their first session.</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeTransition, type SegmentTransitionsResult } from "@/lib/analytics/segment-history";

export default function SegmentTransitions({ result }: { result: SegmentTransitionsResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Recovery &amp; Transitions</CardTitle>
      </CardHeader>
      <CardContent>
        {result.insufficientData ? (
          <p className="text-sm text-muted-foreground">
            {result.firstSnapshotDate
              ? `Segment transition tracking began on ${result.firstSnapshotDate}. Check back once more daily snapshots have accumulated.`
              : "Segment transition tracking hasn't started yet — it begins once the daily snapshot job first runs."}
          </p>
        ) : result.transitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No learners changed segment between {result.earlierDate} and {result.laterDate}.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Comparing segment snapshots from {result.earlierDate} to {result.laterDate}.
            </p>
            <ul className="space-y-1.5 text-sm">
              {result.transitions.slice(0, 8).map((t) => (
                <li key={`${t.from}-${t.to}`} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                  <span className="text-foreground">{describeTransition(t)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

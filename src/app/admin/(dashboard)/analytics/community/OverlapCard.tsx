import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningCommunityOverlap } from "@/lib/analytics/community-analytics";

export default function OverlapCard({ overlap }: { overlap: LearningCommunityOverlap }) {
  const total = Math.max(1, overlap.courseOnly + overlap.communityOnly + overlap.both + overlap.neither);
  const segments: { label: string; value: number; className: string }[] = [
    { label: "Courses only", value: overlap.courseOnly, className: "bg-primary" },
    { label: "Both", value: overlap.both, className: "bg-success" },
    { label: "Community only", value: overlap.communityOnly, className: "bg-warning" },
    { label: "Neither", value: overlap.neither, className: "bg-muted-foreground/30" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning &amp; Community Overlap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((s) => (
            <div key={s.label} className={s.className} style={{ width: `${Math.max(0, (s.value / total) * 100)}%` }} title={`${s.label}: ${s.value}`} />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className={`size-2.5 shrink-0 rounded-full ${s.className}`} />
              <span className="text-muted-foreground">
                {s.label}: <span className="font-medium text-foreground">{s.value.toLocaleString()}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

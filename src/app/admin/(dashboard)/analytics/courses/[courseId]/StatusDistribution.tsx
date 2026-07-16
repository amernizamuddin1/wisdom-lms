import Link from "next/link";

type Segment = { key: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"; label: string; count: number; colorClass: string };

export default function StatusDistribution({ courseId, notStarted, inProgress, completed }: { courseId: string; notStarted: number; inProgress: number; completed: number }) {
  const total = Math.max(1, notStarted + inProgress + completed);
  const segments: Segment[] = [
    { key: "NOT_STARTED", label: "Not Started", count: notStarted, colorClass: "bg-muted-foreground/40" },
    { key: "IN_PROGRESS", label: "In Progress", count: inProgress, colorClass: "bg-warning" },
    { key: "COMPLETED", label: "Completed", count: completed, colorClass: "bg-success" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <div key={s.key} className={s.colorClass} style={{ width: `${(s.count / total) * 100}%` }} title={`${s.label}: ${s.count}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {segments.map((s) => (
          <Link
            key={s.key}
            href={`/admin/analytics/learners?courseId=${courseId}&courseStatus=${s.key}`}
            className="flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 text-sm transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <span className={`size-2.5 rounded-full ${s.colorClass}`} />
            <span className="text-foreground">{s.label}</span>
            <span className="text-muted-foreground">
              {s.count} ({Math.round((s.count / total) * 100)}%)
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

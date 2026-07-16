import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import type { LessonDropoffRow, DropoffSort } from "@/lib/analytics/lesson-dropoff";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { key: DropoffSort; label: string }[] = [
  { key: "order", label: "Lesson order" },
  { key: "highest-dropoff", label: "Highest drop-off" },
  { key: "lowest-completion", label: "Lowest completion" },
  { key: "highest-avg-time", label: "Highest avg. time spent" },
];

export default function LessonDropoffTable({ courseId, rows, sort }: { courseId: string; rows: LessonDropoffRow[]; sort: DropoffSort }) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-foreground">Lesson Drop-Off Analysis</h3>
          <InfoTooltip text={METRIC_TOOLTIPS.lessonDropoff} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.key}
              href={`/admin/analytics/courses/${courseId}?sort=${opt.key}`}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                sort === opt.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Lesson</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Completion Rate</th>
              <th className="px-4 py-3 font-medium">Drop-Off Rate</th>
              <th className="px-4 py-3 font-medium">Stopped Here</th>
              <th className="px-4 py-3 font-medium">Avg. Time Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.lessonId} className={cn("hover:bg-muted/50", r.isHighDropoff && "bg-destructive-soft/40")}>
                <td className="px-4 py-3 text-muted-foreground">{r.order}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.chapterTitle}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.learnersEligible}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.learnersCompleted}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.completionRate}%</td>
                <td className="px-4 py-3">
                  {r.dropOffRate === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={cn(r.isHighDropoff ? "font-semibold text-destructive" : "text-muted-foreground")}>
                      {r.dropOffRate}%
                      {r.isHighDropoff && (
                        <Badge variant="destructive" className="ml-2">
                          High
                        </Badge>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.stoppedAfterCount}</td>
                <td className="px-4 py-3 text-muted-foreground" title="Per-lesson time tracking isn't available in the current data model">
                  —
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  This course has no lessons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/analytics/format";
import type { LearnerCourseRow } from "@/lib/analytics/learners";

const STATUS_LABEL: Record<LearnerCourseRow["status"], string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const STATUS_VARIANT: Record<LearnerCourseRow["status"], "outline" | "default" | "success"> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "success",
};

export default function LearnerCoursesTable({ courses }: { courses: LearnerCourseRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium">Enrolled</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Time Spent</th>
            <th className="px-4 py-3 font-medium">Quiz Score</th>
            <th className="px-4 py-3 font-medium">Completed</th>
            <th className="px-4 py-3 font-medium">Access Expiry</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {courses.map((c) => (
            <tr key={c.courseId} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-medium text-foreground">{c.courseTitle}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.enrolledAt.toLocaleDateString()}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.progress}%</td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatHours(c.timeSpentSeconds)}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.quizScore ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.completedAt ? c.completedAt.toLocaleDateString() : "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.accessEndAt ? c.accessEndAt.toLocaleDateString() : "Permanent"}</td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                Not enrolled in any course yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

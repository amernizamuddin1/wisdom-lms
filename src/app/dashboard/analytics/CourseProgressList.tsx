import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/gamification/format";
import type { CourseProgressRow } from "@/lib/gamification/analytics-data";

export default function CourseProgressList({ courses }: { courses: CourseProgressRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground">You&apos;re not enrolled in any courses yet.</p>
        )}
        {courses.map((c) => (
          <div key={c.courseId} className="space-y-2 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium text-foreground">{c.title}</h4>
              <span className="text-sm font-medium text-foreground">{c.percentComplete}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${c.percentComplete}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <span>
                {c.lessonsCompleted}/{c.lessonsTotal} lessons
              </span>
              <span>
                {c.modulesCompleted}/{c.modulesTotal} modules
              </span>
              <span>{formatDuration(c.learningTimeSeconds)} learned</span>
              <span>{c.quizAverage != null ? `${c.quizAverage}% quiz avg` : "No quizzes yet"}</span>
            </div>
            {c.lastActivityAt && (
              <p className="text-xs text-muted-foreground">
                Last activity {c.lastActivityAt.toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

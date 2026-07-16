import type { QuizPerformanceRow } from "@/lib/analytics/quizzes";

export default function QuizPerformanceTable({ rows }: { rows: QuizPerformanceRow[] }) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold text-foreground">Quiz Performance</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Quiz</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">Unique Learners</th>
              <th className="px-4 py-3 font-medium">Avg Score</th>
              <th className="px-4 py-3 font-medium">Pass Rate</th>
              <th className="px-4 py-3 font-medium">Failure Rate</th>
              <th className="px-4 py-3 font-medium">Avg Attempts to Pass</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.quizId} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{r.quizTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.courseTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.attempts}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.uniqueLearners}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.averageScore ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.passRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{r.failureRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{r.averageAttemptsToPass ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No quiz attempts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

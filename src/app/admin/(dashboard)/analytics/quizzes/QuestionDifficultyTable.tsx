"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import { cn } from "@/lib/utils";
import type { QuestionDifficultyRow } from "@/lib/analytics/quiz-difficulty";
import type { QuestionAttemptDetail } from "@/lib/analytics/quiz-difficulty";
import { fetchQuestionAttemptDetail } from "./actions";

const DIFFICULTY_VARIANT: Record<string, "success" | "default" | "outline" | "destructive"> = {
  Easy: "success",
  Moderate: "default",
  Hard: "outline",
  "Very Hard": "destructive",
};

export default function QuestionDifficultyTable({ rows }: { rows: QuestionDifficultyRow[] }) {
  const [selected, setSelected] = useState<QuestionDifficultyRow | null>(null);
  const [detail, setDetail] = useState<QuestionAttemptDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function openDetail(row: QuestionDifficultyRow) {
    setSelected(row);
    setLoading(true);
    try {
      const result = await fetchQuestionAttemptDetail(row.questionId);
      setDetail(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <h3 className="font-semibold text-foreground">Question Difficulty Analysis</h3>
        <InfoTooltip text={METRIC_TOOLTIPS.questionDifficulty} />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Question</th>
              <th className="px-4 py-3 font-medium">Quiz</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">Correct</th>
              <th className="px-4 py-3 font-medium">Incorrect</th>
              <th className="px-4 py-3 font-medium">Correct %</th>
              <th className="px-4 py-3 font-medium">Difficulty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.questionId} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(r)}>
                <td className="px-4 py-3 font-medium text-foreground">{r.questionPreview}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.quizTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.attempts}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.correct}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.incorrect}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.correctPercent}%</td>
                <td className="px-4 py-3">
                  <Badge variant={DIFFICULTY_VARIANT[r.difficulty]}>{r.difficulty}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No question attempts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setDetail(null);
          }
        }}
      >

        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.questionPreview}</DialogTitle>
            <DialogDescription>
              {selected?.quizTitle} · {selected?.attempts} attempts · {selected?.correctPercent}% correct
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading attempt details...</p>
          ) : detail && detail.answers.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {detail.answers.map((a, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="font-medium text-foreground">{a.learnerName}</p>
                    <p className="text-xs text-muted-foreground">{a.attemptedAt.toLocaleString()}</p>
                  </div>
                  <span className={cn("text-xs font-medium", a.isCorrect ? "text-success" : "text-destructive")}>
                    {a.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No recorded attempts for this question.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

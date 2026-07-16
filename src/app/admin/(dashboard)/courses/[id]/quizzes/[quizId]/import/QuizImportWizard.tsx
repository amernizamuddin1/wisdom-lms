"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  parseQuizCsv,
  confirmQuizImport,
  downloadQuizCsvTemplate,
  type ParseQuizCsvState,
  type ConfirmQuizImportState,
} from "./actions";

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const parseInitial: ParseQuizCsvState = {};
const confirmInitial: ConfirmQuizImportState = {};

export default function QuizImportWizard({ courseId, quizId }: { courseId: string; quizId: string }) {
  const parseAction = parseQuizCsv.bind(null, quizId);
  const confirmActionBound = confirmQuizImport.bind(null, quizId, courseId);

  const [parseState, parseFormAction, parsePending] = useActionState(parseAction, parseInitial);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    confirmActionBound,
    confirmInitial,
  );

  const quizUrl = `/admin/courses/${courseId}/quizzes/${quizId}`;

  if (confirmState.done) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Import Complete</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Total Rows" value={confirmState.totalRows ?? 0} />
            <Stat label="Created" value={confirmState.successCount ?? 0} variant="success" />
            <Stat label="Failed" value={confirmState.failureCount ?? 0} variant="destructive" />
          </div>

          {confirmState.failures && confirmState.failures.length > 0 && (
            <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              {confirmState.failures.map((f, i) => (
                <p key={i} className="text-sm text-destructive">
                  Row {f.row}: {f.reason}
                </p>
              ))}
            </div>
          )}

          <Button asChild>
            <Link href={quizUrl}>Back to Quiz</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (parseState.rows) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Preview</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-success">{parseState.validCount} valid</span>
            <span className="text-destructive">{parseState.invalidCount} invalid</span>
          </div>

          <div className="max-h-96 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parseState.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-foreground">{row.questionText}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.questionType}</td>
                    <td className="px-3 py-2">
                      {row.errors.length > 0 ? (
                        <span className="text-destructive">{row.errors.join(" ")}</span>
                      ) : (
                        <Badge variant="success">Valid</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={confirmFormAction} className="flex items-center gap-3">
            <input type="hidden" name="csvText" value={parseState.csvText} />
            {confirmState.error && <p className="text-sm text-destructive">{confirmState.error}</p>}
            <Button type="submit" disabled={confirmPending || parseState.validCount === 0}>
              {confirmPending ? "Importing..." : `Confirm Import (${parseState.validCount})`}
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Start Over
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Upload CSV</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              const csv = await downloadQuizCsvTemplate();
              triggerCsvDownload(csv, "quiz-import-template.csv");
            }}
          >
            Download Template
          </Button>
        </div>

        <form action={parseFormAction} className="space-y-4">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          {parseState.error && <p className="text-sm text-destructive">{parseState.error}</p>}
          <Button type="submit" disabled={parsePending}>
            {parsePending ? "Parsing..." : "Preview Import"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "success" | "destructive";
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          variant === "success"
            ? "text-xl font-semibold text-emerald-600 dark:text-emerald-400"
            : variant === "destructive"
              ? "text-xl font-semibold text-destructive"
              : "text-xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

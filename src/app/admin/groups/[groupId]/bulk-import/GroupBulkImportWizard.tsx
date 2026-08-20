"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  parseGroupCsv,
  confirmGroupImport,
  downloadGroupCsvTemplate,
  type ParseGroupCsvState,
  type ConfirmGroupImportState,
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

const parseInitial: ParseGroupCsvState = {};
const confirmInitial: ConfirmGroupImportState = {};

export default function GroupBulkImportWizard({ groupId }: { groupId: string }) {
  const [parseState, parseAction, parsePending] = useActionState(
    parseGroupCsv.bind(null, groupId),
    parseInitial,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmGroupImport.bind(null, groupId),
    confirmInitial,
  );

  if (confirmState.done) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Import Complete</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Total Rows" value={confirmState.totalRows ?? 0} />
            <Stat label="Added" value={confirmState.successCount ?? 0} variant="success" />
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
            <Link href={`/admin/groups/${groupId}`}>Back to Roster</Link>
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
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-success">{parseState.validCount} valid</span>
            <span className="text-muted-foreground">{parseState.existingCount} existing account</span>
            <span className="text-muted-foreground">{parseState.alreadyInGroupCount} already in this institution</span>
            <span className="text-destructive">{parseState.invalidCount} invalid</span>
          </div>

          <div className="max-h-96 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Course</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parseState.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-foreground">{row.fullName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.courseTitle || "—"}</td>
                    <td className="px-3 py-2">
                      {row.errors.length > 0 ? (
                        <span className="text-destructive">{row.errors.join(" ")}</span>
                      ) : row.alreadyInGroup ? (
                        <Badge variant="outline">Already a member</Badge>
                      ) : row.existsAlready ? (
                        <Badge variant="success">Add existing account</Badge>
                      ) : (
                        <Badge variant="success">Create</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={confirmAction} className="flex items-center gap-3">
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
              const csv = await downloadGroupCsvTemplate(groupId);
              triggerCsvDownload(csv, "institution-bulk-import-template.csv");
            }}
          >
            Download Template
          </Button>
        </div>

        <form action={parseAction} className="space-y-4">
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

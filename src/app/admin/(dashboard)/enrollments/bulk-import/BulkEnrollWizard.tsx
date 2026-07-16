"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parseEnrollmentCsv,
  confirmEnrollmentImport,
  downloadEnrollmentCsvTemplate,
  type ParseEnrollmentCsvState,
  type ConfirmEnrollmentImportState,
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

const DURATION_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "9", label: "9 months" },
  { value: "12", label: "12 months" },
  { value: "custom", label: "Custom end date" },
  { value: "forever", label: "Forever" },
];

const parseInitial: ParseEnrollmentCsvState = {};
const confirmInitial: ConfirmEnrollmentImportState = {};

export default function BulkEnrollWizard({
  courses,
  bundles,
}: {
  courses: { id: string; title: string }[];
  bundles: { id: string; title: string }[];
}) {
  const [parseState, parseAction, parsePending] = useActionState(parseEnrollmentCsv, parseInitial);
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmEnrollmentImport,
    confirmInitial,
  );

  const [targetType, setTargetType] = useState<"COURSE" | "BUNDLE">("COURSE");
  const [targetId, setTargetId] = useState("");
  const [duration, setDuration] = useState("");

  if (confirmState.done) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Import Complete</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Total Rows" value={confirmState.totalRows ?? 0} />
            <Stat label="Enrolled" value={confirmState.successCount ?? 0} variant="success" />
            <Stat label="New Accounts" value={confirmState.newAccountsCreated ?? 0} />
            <Stat label="Skipped (already enrolled)" value={confirmState.skippedCount ?? 0} />
            <Stat label="Failed" value={confirmState.failureCount ?? 0} variant="destructive" />
          </div>

          {(confirmState.newAccountsCreated ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              New learners were emailed a temporary password to log in and get started.
            </p>
          )}

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
            <Link href="/admin/enrollments/new">Back to Enrollments</Link>
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
          <p className="text-sm text-muted-foreground">
            Enrolling into <span className="font-medium text-foreground">{parseState.targetLabel}</span>
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-success">{parseState.validCount} valid</span>
            <span className="text-muted-foreground">{parseState.newAccountCount} new accounts</span>
            <span className="text-muted-foreground">
              {parseState.alreadyEnrolledCount} already enrolled (skip)
            </span>
            <span className="text-destructive">{parseState.invalidCount} invalid</span>
          </div>

          <div className="max-h-96 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parseState.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-foreground">{row.name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.errors.length > 0 ? (
                        <span className="text-destructive">{row.errors.join(" ")}</span>
                      ) : row.alreadyEnrolled ? (
                        <Badge variant="outline">Skip (already enrolled)</Badge>
                      ) : row.willCreateAccount ? (
                        <Badge variant="success">Create Account + Enroll</Badge>
                      ) : (
                        <Badge variant="success">Enroll</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={confirmAction} className="flex items-center gap-3">
            <input type="hidden" name="csvText" value={parseState.csvText} />
            <input type="hidden" name="targetType" value={parseState.targetType} />
            <input type="hidden" name="targetId" value={parseState.targetId} />
            <input type="hidden" name="duration" value={duration} />
            {confirmState.error && <p className="text-sm text-destructive">{confirmState.error}</p>}
            <Button type="submit" disabled={confirmPending || parseState.validCount === 0}>
              {confirmPending ? "Enrolling..." : `Confirm Enrollment (${parseState.validCount})`}
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
          <h2 className="text-lg font-semibold text-foreground">Bulk Enroll via CSV</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              const csv = await downloadEnrollmentCsvTemplate();
              triggerCsvDownload(csv, "bulk-enrollment-template.csv");
            }}
          >
            Download Template
          </Button>
        </div>

        <form action={parseAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="targetType">Enroll into</Label>
              <Select
                name="targetType"
                value={targetType}
                onValueChange={(v) => {
                  setTargetType(v as "COURSE" | "BUNDLE");
                  setTargetId("");
                }}
              >
                <SelectTrigger id="targetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COURSE">A Course</SelectItem>
                  <SelectItem value="BUNDLE">A Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="targetId">{targetType === "COURSE" ? "Course" : "Bundle"}</Label>
              <Select name="targetId" value={targetId} onValueChange={setTargetId} required>
                <SelectTrigger id="targetId">
                  <SelectValue placeholder={targetType === "COURSE" ? "Select a course" : "Select a bundle"} />
                </SelectTrigger>
                <SelectContent>
                  {(targetType === "COURSE" ? courses : bundles).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {targetType === "COURSE" && (
            <div className="space-y-1.5">
              <Label htmlFor="duration">Access duration</Label>
              <Select name="duration" value={duration} onValueChange={setDuration} required>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select a duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetType === "COURSE" && duration === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="customEndDate">Custom end date</Label>
              <input
                id="customEndDate"
                name="customEndDate"
                type="date"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              />
            </div>
          )}

          {targetType === "BUNDLE" && (
            <p className="text-xs text-muted-foreground">
              Bundles use their own configured access duration, set on the bundle itself.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="file">CSV file</Label>
            <input
              type="file"
              id="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

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

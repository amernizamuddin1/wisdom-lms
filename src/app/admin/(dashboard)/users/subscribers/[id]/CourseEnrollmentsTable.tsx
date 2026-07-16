"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import RevokeConfirmDialog, { type RevokeTarget } from "./RevokeConfirmDialog";
import { revokeCourseGrants } from "./actions";

export type CourseGrantRow = {
  id: string;
  courseTitle: string;
  source: string;
  grantedAt: string;
  accessStartAt: string;
  accessEndAt: string;
  status: "ACTIVE" | "CANCELLED";
  reference: string;
};

const STATUS_VARIANT: Record<CourseGrantRow["status"], "success" | "outline"> = {
  ACTIVE: "success",
  CANCELLED: "outline",
};

export default function CourseEnrollmentsTable({
  subscriberId,
  subscriberName,
  subscriberEmail,
  rows,
}: {
  subscriberId: string;
  subscriberName: string;
  subscriberEmail: string;
  rows: CourseGrantRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<RevokeTarget>(null);
  const [pendingGrantIds, setPendingGrantIds] = useState<string[]>([]);

  const activeRows = rows.filter((r) => r.status === "ACTIVE");
  const allSelected = activeRows.length > 0 && activeRows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activeRows.map((r) => r.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openSingle(row: CourseGrantRow) {
    setPendingGrantIds([row.id]);
    setTarget({
      label: `${row.courseTitle} (${row.source})`,
      currentStatus: row.status,
      consequence:
        "This removes only this enrollment source. If another active source still grants access to this course, the subscriber will keep access.",
    });
  }

  function openBulk() {
    const rowsToRevoke = activeRows.filter((r) => selected.has(r.id));
    if (rowsToRevoke.length === 0) return;
    setPendingGrantIds(rowsToRevoke.map((r) => r.id));
    setTarget({
      label: `${rowsToRevoke.length} course enrollment${rowsToRevoke.length > 1 ? "s" : ""}`,
      currentStatus: "Active",
      consequence:
        "Each selected enrollment source will be removed. Courses with another still-active source will remain accessible.",
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Active Course Enrollments</h3>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={openBulk}>
            Remove Selected Access ({selected.size})
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all active course enrollments"
                />
              </th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Enrolled</th>
              <th className="px-4 py-3 font-medium">Access Start</th>
              <th className="px-4 py-3 font-medium">Access End</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  {row.status === "ACTIVE" && (
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={() => toggleRow(row.id)}
                      aria-label={`Select ${row.courseTitle}`}
                    />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{row.courseTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.source}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.grantedAt}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.accessStartAt}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.accessEndAt}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.reference}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {row.status === "ACTIVE" && (
                    <Button variant="outline" size="sm" onClick={() => openSingle(row)}>
                      Unsubscribe
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No course enrollments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RevokeConfirmDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
        subscriberName={subscriberName}
        subscriberEmail={subscriberEmail}
        onConfirm={async (reason) => {
          const result = await revokeCourseGrants(subscriberId, pendingGrantIds, reason);
          if (result.success) setSelected(new Set());
          return result;
        }}
      />
    </div>
  );
}

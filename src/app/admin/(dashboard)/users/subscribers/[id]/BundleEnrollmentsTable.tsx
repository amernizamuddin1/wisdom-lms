"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RevokeConfirmDialog, { type RevokeTarget } from "./RevokeConfirmDialog";
import { revokeBundle } from "./actions";

export type BundleEnrollmentRow = {
  id: string;
  bundleName: string;
  includedCourses: string;
  enrolledAt: string;
  status: "ACTIVE" | "CANCELLED";
};

const STATUS_VARIANT: Record<BundleEnrollmentRow["status"], "success" | "outline"> = {
  ACTIVE: "success",
  CANCELLED: "outline",
};

export default function BundleEnrollmentsTable({
  subscriberId,
  subscriberName,
  subscriberEmail,
  rows,
}: {
  subscriberId: string;
  subscriberName: string;
  subscriberEmail: string;
  rows: BundleEnrollmentRow[];
}) {
  const [target, setTarget] = useState<RevokeTarget>(null);
  const [pendingBundleEnrollmentId, setPendingBundleEnrollmentId] = useState<string | null>(null);

  function openRevoke(row: BundleEnrollmentRow) {
    setPendingBundleEnrollmentId(row.id);
    setTarget({
      label: row.bundleName,
      currentStatus: row.status,
      consequence:
        "This revokes the entire bundle. Every course granted through this bundle loses that grant — courses that also have a separate direct purchase or admin assignment will remain accessible through that other source.",
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Bundle Enrollments</h3>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Bundle</th>
              <th className="px-4 py-3 font-medium">Included Courses</th>
              <th className="px-4 py-3 font-medium">Enrolled</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{row.bundleName}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.includedCourses}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.enrolledAt}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {row.status === "ACTIVE" && (
                    <Button variant="outline" size="sm" onClick={() => openRevoke(row)}>
                      Remove Access
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No bundle enrollments.
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
          if (!pendingBundleEnrollmentId) return { error: "Nothing selected." };
          return revokeBundle(subscriberId, pendingBundleEnrollmentId, reason);
        }}
      />
    </div>
  );
}

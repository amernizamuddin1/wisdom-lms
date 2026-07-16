"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { markReportUnderReviewAction, resolveReportAction, dismissReportAction } from "./actions";

export default function ReportActions({ reportId, status }: { reportId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");

  function run(action: () => Promise<{ error?: string; success?: boolean }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
      else toast.success(successMsg);
    });
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Resolution notes (optional)..."
        rows={2}
      />
      <div className="flex gap-2">
        {status === "OPEN" && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => markReportUnderReviewAction(reportId), "Marked under review.")}
          >
            Mark under review
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => resolveReportAction(reportId, notes.trim() || undefined), "Report resolved.")}
        >
          Resolve
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => run(() => dismissReportAction(reportId, notes.trim() || undefined), "Report dismissed.")}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

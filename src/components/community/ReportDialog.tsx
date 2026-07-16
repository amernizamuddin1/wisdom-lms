"use client";

import { useState, useTransition } from "react";
import { FlagIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommunityActions } from "@/components/community/actions-context";
import type { ReportReason } from "@/lib/community/reports";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "OFFENSIVE", label: "Offensive content" },
  { value: "MISLEADING", label: "Misleading" },
  { value: "INAPPROPRIATE", label: "Inappropriate" },
  { value: "OTHER", label: "Other" },
];

export default function ReportDialog({
  entityType,
  entityId,
  isSignedIn,
}: {
  entityType: "THREAD" | "ANSWER" | "REPLY";
  entityId: string;
  isSignedIn: boolean;
}) {
  const { createReportAction } = useCommunityActions();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  function handleTriggerClick(e: React.MouseEvent) {
    if (!isSignedIn) {
      e.preventDefault();
      toast.info("Log in to report content.");
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createReportAction({ entityType, entityId, reason, details: details.trim() || undefined });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Report submitted. A moderator will review it.");
        setOpen(false);
        setDetails("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" onClick={handleTriggerClick} className="gap-1.5 text-muted-foreground">
          <FlagIcon className="size-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>Let us know why this content violates community guidelines.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any additional context..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? "Submitting..." : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

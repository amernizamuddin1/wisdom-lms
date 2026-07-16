"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type RevokeTarget = {
  label: string;
  currentStatus: string;
  consequence: string;
} | null;

export default function RevokeConfirmDialog({
  target,
  onOpenChange,
  subscriberName,
  subscriberEmail,
  onConfirm,
}: {
  target: RevokeTarget;
  onOpenChange: (open: boolean) => void;
  subscriberName: string;
  subscriberEmail: string;
  onConfirm: (reason: string | null) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm(reason.trim() || null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Access removed.");
      setReason("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={target != null}
      onOpenChange={(open) => {
        if (!open) setReason("");
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Access</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this subscriber&apos;s access? The subscriber will no
            longer be able to access the selected course or bundle.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="grid grid-cols-[100px_1fr] gap-y-1.5">
              <span className="text-muted-foreground">Subscriber</span>
              <span className="font-medium text-foreground">{subscriberName}</span>
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{subscriberEmail}</span>
              <span className="text-muted-foreground">Target</span>
              <span className="text-foreground">{target.label}</span>
              <span className="text-muted-foreground">Current status</span>
              <span className="text-foreground">{target.currentStatus}</span>
            </div>
            <p className="text-warning">{target.consequence}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="revocation-reason">Reason (optional)</Label>
          <Textarea
            id="revocation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Internal note about why access is being removed..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Removing..." : "Remove Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

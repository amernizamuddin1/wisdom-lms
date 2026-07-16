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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { issueOrderRefund } from "./actions";

export type RefundTarget = {
  orderId: string;
  orderNumber: string;
  maxAmount: number;
};

// Self-contained: owns its own open/closed state, so the (server component)
// orders table can render one of these per row without lifting dialog state
// up into a client wrapper for the whole table.
export default function RefundDialog({ target }: { target: RefundTarget }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setAmount("");
    setReason("");
  }

  function handleConfirm() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }

    startTransition(async () => {
      const result = await issueOrderRefund(target.orderId, parsed, reason.trim() || null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Refund recorded.");
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a Refund</DialogTitle>
          <DialogDescription>
            This records the refund for reporting purposes and updates the order&apos;s status. It
            does not call Razorpay — issue the refund there first (or via another channel), then
            record it here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[100px_1fr] gap-y-1.5 rounded-lg border bg-muted/40 p-4 text-sm">
            <span className="text-muted-foreground">Order</span>
            <span className="font-medium text-foreground">{target.orderNumber}</span>
            <span className="text-muted-foreground">Refundable</span>
            <span className="text-foreground">up to ₹{target.maxAmount.toLocaleString()}</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">Refund amount (₹)</Label>
            <Input
              id="refund-amount"
              type="number"
              min={0}
              max={target.maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={target.maxAmount.toString()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund-reason">Reason (optional)</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this refund was issued..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Recording..." : "Record Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

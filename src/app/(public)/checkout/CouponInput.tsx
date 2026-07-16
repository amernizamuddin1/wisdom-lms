"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { previewCouponAction } from "./actions";

export default function CouponInput({
  onApplied,
  onRemoved,
}: {
  onApplied: (code: string, discountAmount: number) => void;
  onRemoved: () => void;
}) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountAmount: number } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await previewCouponAction(trimmed);
      if (result.error || result.discountAmount == null) {
        toast.error(result.error ?? "Couldn't apply this coupon.");
        return;
      }
      const normalized = trimmed.toUpperCase();
      setApplied({ code: normalized, discountAmount: result.discountAmount });
      onApplied(normalized, result.discountAmount);
      toast.success("Coupon applied");
    });
  }

  function handleRemove() {
    setApplied(null);
    setCode("");
    onRemoved();
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="font-medium text-foreground">
          Coupon &ldquo;{applied.code}&rdquo; applied
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Coupon code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleApply();
          }
        }}
      />
      <Button type="button" variant="outline" disabled={pending || !code.trim()} onClick={handleApply}>
        {pending ? "Applying..." : "Apply"}
      </Button>
    </div>
  );
}

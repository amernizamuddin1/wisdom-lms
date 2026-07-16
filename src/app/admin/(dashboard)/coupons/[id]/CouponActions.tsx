"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setCouponActive, deleteCoupon } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CouponActions({
  couponId,
  isActive,
}: {
  couponId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const result = await setCouponActive(couponId, !isActive);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(isActive ? "Coupon deactivated." : "Coupon activated.");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteCoupon(couponId);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant={isActive ? "success" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
      <Button variant="outline" size="sm" onClick={toggleActive} disabled={pending}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
        Delete
      </Button>
    </div>
  );
}

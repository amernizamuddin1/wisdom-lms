"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { RevenueGranularity } from "@/lib/analytics/commerce-revenue";

type PaymentStatusFilter = "all" | "PAID" | "FAILED" | "PENDING";

const GRANULARITIES: { key: RevenueGranularity; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

const PAYMENT_STATUSES: { key: PaymentStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "FAILED", label: "Failed" },
  { key: "PENDING", label: "Pending" },
];

export default function RevenueControls({
  granularity,
  paymentStatus,
  discountedOnly,
}: {
  granularity: RevenueGranularity;
  paymentStatus: PaymentStatusFilter;
  discountedOnly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all" || value === "day" || value === "false") params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Granularity</Label>
        <div className="flex gap-1.5">
          {GRANULARITIES.map((g) => (
            <Button
              key={g.key}
              type="button"
              size="sm"
              variant={granularity === g.key ? "default" : "outline"}
              onClick={() => setParams({ granularity: g.key })}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Payment status</Label>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_STATUSES.map((s) => (
            <Button
              key={s.key}
              type="button"
              size="sm"
              variant={paymentStatus === s.key ? "default" : "outline"}
              onClick={() => setParams({ paymentStatus: s.key })}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pb-1.5">
        <Checkbox
          id="discountedOnly"
          checked={discountedOnly}
          onCheckedChange={(checked) => setParams({ discountedOnly: checked ? "true" : null })}
        />
        <Label htmlFor="discountedOnly" className="text-sm text-foreground">
          Discounted only
        </Label>
      </div>
    </div>
  );
}

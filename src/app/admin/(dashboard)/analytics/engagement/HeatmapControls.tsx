"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { HeatmapActivityType } from "@/lib/analytics/heatmap";

const OPTIONS: { key: HeatmapActivityType; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "learning", label: "Learning" },
  { key: "quiz", label: "Quiz" },
  { key: "community", label: "Community" },
];

export default function HeatmapControls({ current }: { current: HeatmapActivityType }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setActivityType(type: HeatmapActivityType) {
    const params = new URLSearchParams(searchParams.toString());
    if (type === "all") params.delete("heatmapType");
    else params.set("heatmapType", type);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((opt) => (
        <Button key={opt.key} type="button" size="sm" variant={current === opt.key ? "default" : "outline"} onClick={() => setActivityType(opt.key)}>
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

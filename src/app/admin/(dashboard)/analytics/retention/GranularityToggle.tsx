"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CohortGranularity } from "@/lib/analytics/retention";

export default function GranularityToggle({ current }: { current: CohortGranularity }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setGranularity(granularity: CohortGranularity) {
    const params = new URLSearchParams(searchParams.toString());
    if (granularity === "week") params.delete("cohort");
    else params.set("cohort", granularity);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1.5">
      <Button type="button" size="sm" variant={current === "week" ? "default" : "outline"} onClick={() => setGranularity("week")}>
        Weekly
      </Button>
      <Button type="button" size="sm" variant={current === "month" ? "default" : "outline"} onClick={() => setGranularity("month")}>
        Monthly
      </Button>
    </div>
  );
}

"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CohortRow, CohortGranularity } from "@/lib/analytics/retention";

function intensityClass(percent: number | null): string {
  if (percent === null) return "bg-transparent";
  if (percent <= 0) return "bg-muted/40";
  if (percent < 20) return "bg-primary/15";
  if (percent < 40) return "bg-primary/30";
  if (percent < 60) return "bg-primary/50";
  if (percent < 80) return "bg-primary/70";
  return "bg-primary/90";
}

export default function CohortHeatmap({ rows, maxPeriods, granularity }: { rows: CohortRow[]; maxPeriods: number; granularity: CohortGranularity }) {
  if (rows.length === 0) {
    return <div className="flex h-32 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">Not enough enrollment history to build cohorts yet.</div>;
  }

  const periodLabel = granularity === "week" ? "Week" : "Month";
  const periods = Array.from({ length: maxPeriods + 1 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground">Cohort</th>
            <th className="text-left text-xs font-medium text-muted-foreground">Size</th>
            {periods.map((p) => (
              <th key={p} className="w-14 text-center text-xs font-medium text-muted-foreground">
                {periodLabel} {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortStart}>
              <td className="whitespace-nowrap py-1 pr-2 text-xs text-foreground">{row.cohortLabel}</td>
              <td className="py-1 pr-2 text-xs text-muted-foreground">{row.cohortSize}</td>
              {row.periods.map((cell) => (
                <td key={cell.period} className="p-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn("flex h-9 w-14 items-center justify-center rounded-sm text-[11px] font-medium", intensityClass(cell.retentionPercent), cell.retentionPercent !== null && cell.retentionPercent >= 40 ? "text-primary-foreground" : "text-foreground")}>
                        {cell.retentionPercent === null ? "" : `${cell.retentionPercent}%`}
                      </div>
                    </TooltipTrigger>
                    {cell.retentionPercent !== null && (
                      <TooltipContent>
                        {row.cohortLabel} · {periodLabel} {cell.period}: {cell.retainedCount} of {row.cohortSize} retained ({cell.retentionPercent}%)
                      </TooltipContent>
                    )}
                  </Tooltip>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

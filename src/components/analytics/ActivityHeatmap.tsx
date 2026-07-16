"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type HeatmapCell = { dayOfWeek: number; hour: number; uniqueLearners: number; events: number };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function intensityClass(ratio: number): string {
  if (ratio <= 0) return "bg-muted/40";
  if (ratio < 0.2) return "bg-primary/15";
  if (ratio < 0.4) return "bg-primary/30";
  if (ratio < 0.6) return "bg-primary/50";
  if (ratio < 0.8) return "bg-primary/70";
  return "bg-primary/90";
}

function hourLabel(hour: number): string {
  const next = (hour + 1) % 24;
  return `${hour.toString().padStart(2, "0")}:00–${next.toString().padStart(2, "0")}:00`;
}

// Day-of-week x hour-of-day grid. No charting-library primitive fits this
// shape well, so it's a plain CSS grid with a 5-step opacity scale of the
// existing --primary (Wisdom Indigo) token — automatically dark-mode-correct
// since it rides that variable rather than hardcoded hex steps.
export default function ActivityHeatmap({ cells, metric = "events" }: { cells: HeatmapCell[]; metric?: "events" | "uniqueLearners" }) {
  const max = cells.reduce((m, c) => Math.max(m, metric === "events" ? c.events : c.uniqueLearners), 0);

  if (cells.length === 0 || max === 0) {
    return <div className="flex h-40 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">No activity recorded in this range.</div>;
  }

  const byKey = new Map(cells.map((c) => [`${c.dayOfWeek}:${c.hour}`, c]));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px]">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-[10px] text-muted-foreground">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
          {DAY_LABELS.map((label, day) => (
            <div key={day} className="contents">
              <div className="flex items-center text-xs text-muted-foreground">{label}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = byKey.get(`${day}:${hour}`);
                const value = metric === "events" ? (cell?.events ?? 0) : (cell?.uniqueLearners ?? 0);
                const ratio = max === 0 ? 0 : value / max;
                return (
                  <Tooltip key={hour}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn("aspect-square rounded-sm transition-colors", intensityClass(ratio))}
                        role="img"
                        aria-label={`${label}, ${hourLabel(hour)}: ${cell?.uniqueLearners ?? 0} unique learners, ${cell?.events ?? 0} events`}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-center">
                      <div className="font-medium">
                        {label}, {hourLabel(hour)}
                      </div>
                      <div>{cell?.uniqueLearners ?? 0} unique learners</div>
                      <div>{cell?.events ?? 0} total events</div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

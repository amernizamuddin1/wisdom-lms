import type { HeatmapDay } from "@/lib/gamification/analytics-data";

const LEVEL_CLASSES = [
  "bg-surface-tertiary",
  "bg-success-soft",
  "bg-success/40",
  "bg-success/70",
  "bg-success",
];

type Cell = { date: string; level: 0 | 1 | 2 | 3 | 4 } | null;

// `todayKey` is the caller's already-timezone-correct "today" (see
// getDateKeyForUser) — everything here builds off that single string with
// pure UTC-anchored date math, so the grid never drifts from the server
// process's own local time.
export default function ActivityHeatmap({ days, todayKey }: { days: HeatmapDay[]; todayKey: string }) {
  if (days.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Your learning activity will appear here as you progress through your courses.
      </p>
    );
  }

  const byDate = new Map(days.map((d) => [d.date, d.level]));

  const [ty, tm, td] = todayKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(ty, tm - 1, td));

  const TOTAL_DAYS = 371;
  const cells: Cell[] = [];
  for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, level: (byDate.get(key) ?? 0) as 0 | 1 | 2 | 3 | 4 });
  }

  const leadingBlanks = new Date(cells[0]!.date).getUTCDay();
  const padded: Cell[] = [...Array(leadingBlanks).fill(null), ...cells];

  const weeks: Cell[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) =>
              cell ? (
                <div
                  key={di}
                  title={`${cell.date}`}
                  className={`size-3 rounded-sm ${LEVEL_CLASSES[cell.level]}`}
                />
              ) : (
                <div key={di} className="size-3" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        {LEVEL_CLASSES.map((c, i) => (
          <div key={i} className={`size-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

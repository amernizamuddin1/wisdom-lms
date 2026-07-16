// Shared date-range resolver used by every analytics page. Platform-wide
// aggregation queries compare against UserDailyLearningActivity.activityDate,
// which is a per-user-timezone date key — resolving a single admin-wide range
// to UTC day boundaries is a deliberate, documented simplification (exact to
// within one day at the edges of the range for non-UTC learners).
//
// All day-boundary math below is done in UTC explicitly (setUTCHours etc.,
// not local setHours) so the resolved range — and dateKey()'s UTC truncation
// of it — doesn't ALSO drift by a day depending on what timezone the server
// process happens to run in. That would be a second, avoidable bug stacked on
// top of the documented per-user approximation above.

export type RangeKey = "today" | "7d" | "30d" | "90d" | "12m" | "custom";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
  { key: "custom", label: "Custom range" },
];

export type ResolvedRange = {
  key: RangeKey;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return startOfDay(d);
}

export function resolveDateRange(params: { range?: string; from?: string; to?: string }): ResolvedRange {
  const key: RangeKey = isRangeKey(params.range) ? params.range : "30d";
  const now = endOfDay(new Date());

  if (key === "custom" && params.from && params.to) {
    const from = startOfDay(new Date(`${params.from}T00:00:00Z`));
    const to = endOfDay(new Date(`${params.to}T00:00:00Z`));
    return { key, from, to, ...previousWindow(from, to) };
  }

  let from: Date;
  switch (key) {
    case "today":
      from = startOfDay(new Date());
      break;
    case "7d":
      from = daysAgo(6);
      break;
    case "90d":
      from = daysAgo(89);
      break;
    case "12m": {
      const d = new Date();
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      from = startOfDay(d);
      break;
    }
    case "30d":
    default:
      from = daysAgo(29);
      break;
  }

  return { key: key === "custom" ? "30d" : key, from, to: now, ...previousWindow(from, now) };
}

function previousWindow(from: Date, to: Date): { previousFrom: Date; previousTo: Date } {
  const spanMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);
  return { previousFrom, previousTo };
}

function isRangeKey(v: string | undefined): v is RangeKey {
  return v === "today" || v === "7d" || v === "30d" || v === "90d" || v === "12m" || v === "custom";
}

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

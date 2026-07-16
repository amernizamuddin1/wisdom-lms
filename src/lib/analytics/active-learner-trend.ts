import "server-only";
import { dateKey, type ResolvedRange } from "./date-range";
import { getMeaningfulActivityDateKeys, getMeaningfulActivityDateKeysForCourse } from "./shared";

export type ActiveTrendPoint = { date: string; dau: number; wau: number; mau: number };
export type ActiveTrendGranularity = "daily" | "weekly" | "monthly";

function pickGranularity(from: Date, to: Date): ActiveTrendGranularity {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  if (days <= 90) return "daily";
  if (days <= 365) return "weekly";
  return "monthly";
}

function bucketLabel(d: Date, granularity: ActiveTrendGranularity): string {
  if (granularity === "daily") return dateKey(d);
  if (granularity === "weekly") {
    // ISO-ish: label by the Monday of that week.
    const day = d.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diff);
    return dateKey(monday);
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// DAU/WAU/MAU for every point in the series are trailing windows *ending at
// that point's day* (not summed within the bucket) — consistent with the
// point-in-time definitions in definitions.ts and engagement.ts.
export async function getActiveLearnerTrend(
  range: ResolvedRange,
  courseId: string | null,
): Promise<{ granularity: ActiveTrendGranularity; points: ActiveTrendPoint[] }> {
  const { from, to } = range;
  const granularity = pickGranularity(from, to);

  // Fetch one extended map covering [from - 29d, to] so every trailing
  // window (up to 30 days) can be computed from a single query pass.
  const extendedFrom = new Date(from.getTime() - 29 * 86400000);
  const byUser = courseId
    ? await getMeaningfulActivityDateKeysForCourse(extendedFrom, to, courseId)
    : await getMeaningfulActivityDateKeys(extendedFrom, to);

  // Flatten to a sorted array of date keys per user for fast range checks.
  const sortedByUser = new Map<string, string[]>();
  for (const [userId, set] of byUser) sortedByUser.set(userId, [...set].sort());

  function activeCount(windowStartKey: string, cutoffKey: string): number {
    let count = 0;
    for (const keys of sortedByUser.values()) {
      for (const k of keys) {
        if (k >= windowStartKey && k <= cutoffKey) {
          count += 1;
          break;
        }
      }
    }
    return count;
  }

  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  const dailyPoints: { date: Date; dau: number; wau: number; mau: number }[] = [];
  while (cursor.getTime() <= end.getTime()) {
    const cutoffKey = dateKey(cursor);
    const wauStartKey = dateKey(new Date(cursor.getTime() - 6 * 86400000));
    const mauStartKey = dateKey(new Date(cursor.getTime() - 29 * 86400000));
    dailyPoints.push({
      date: new Date(cursor),
      dau: activeCount(cutoffKey, cutoffKey),
      wau: activeCount(wauStartKey, cutoffKey),
      mau: activeCount(mauStartKey, cutoffKey),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (granularity === "daily") {
    return { granularity, points: dailyPoints.map((p) => ({ date: dateKey(p.date), dau: p.dau, wau: p.wau, mau: p.mau })) };
  }

  // Weekly/monthly: take the last day's value within each bucket (a
  // trailing-window metric's most representative point is its most recent
  // day, not an average of overlapping windows).
  const byBucket = new Map<string, (typeof dailyPoints)[number]>();
  for (const p of dailyPoints) {
    byBucket.set(bucketLabel(p.date, granularity), p);
  }
  const points = [...byBucket.entries()].map(([date, p]) => ({ date, dau: p.dau, wau: p.wau, mau: p.mau }));
  return { granularity, points };
}

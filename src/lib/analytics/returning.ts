import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey, type ResolvedRange } from "./date-range";
import { getMeaningfulActivityDateKeys } from "./shared";
import { RESURRECTION_THRESHOLD_DAYS, COMMUNITY_MEANINGFUL_EVENT_TYPES } from "./definitions";

export type ReturningTrendPoint = { date: string; new: number; returning: number; resurrected: number };
export type ReturningGranularity = "daily" | "weekly" | "monthly";

function pickGranularity(from: Date, to: Date): ReturningGranularity {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  if (days <= 90) return "daily";
  if (days <= 365) return "weekly";
  return "monthly";
}

function bucketRanges(from: Date, to: Date, granularity: ReturningGranularity): { start: Date; end: Date; label: string }[] {
  const ranges: { start: Date; end: Date; label: string }[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const start = new Date(cursor);
    let bucketEnd: Date;
    let label: string;
    if (granularity === "daily") {
      bucketEnd = new Date(start);
      label = dateKey(start);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } else if (granularity === "weekly") {
      bucketEnd = new Date(Math.min(start.getTime() + 6 * 86400000, end.getTime()));
      label = dateKey(start);
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      bucketEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
      if (bucketEnd.getTime() > end.getTime()) bucketEnd = new Date(end);
      label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      cursor.setUTCDate(1);
    }
    ranges.push({ start, end: bucketEnd, label });
  }
  return ranges;
}

// New/Returning/Resurrected trend — see definitions.ts for the exact rules.
// "First-ever activity" is computed with a cheap groupBy MIN aggregate (not
// a full per-user history fetch), and the 30-day pre-window lookback reuses
// the same bounded getMeaningfulActivityDateKeys() helper every other Phase
// 2 module uses.
export async function getReturningLearnerTrend(range: ResolvedRange): Promise<{ granularity: ReturningGranularity; points: ReturningTrendPoint[] }> {
  const granularity = pickGranularity(range.from, range.to);
  const ranges = bucketRanges(range.from, range.to, granularity);

  const lookbackStart = new Date(range.from.getTime() - RESURRECTION_THRESHOLD_DAYS * 86400000);
  const [activityMap, firstLearningByUser, firstCommunityByUser] = await Promise.all([
    getMeaningfulActivityDateKeys(lookbackStart, range.to),
    prisma.userDailyLearningActivity.groupBy({ by: ["userId"], where: { isQualifyingDay: true }, _min: { activityDate: true } }),
    prisma.userActivityEvent.groupBy({
      by: ["userId"],
      where: { type: { in: [...COMMUNITY_MEANINGFUL_EVENT_TYPES] } },
      _min: { createdAt: true },
    }),
  ]);

  const firstEverKeyByUser = new Map<string, string>();
  for (const r of firstLearningByUser) {
    if (r._min.activityDate) firstEverKeyByUser.set(r.userId, r._min.activityDate);
  }
  for (const r of firstCommunityByUser) {
    if (!r._min.createdAt) continue;
    const key = dateKey(r._min.createdAt);
    const existing = firstEverKeyByUser.get(r.userId);
    if (!existing || key < existing) firstEverKeyByUser.set(r.userId, key);
  }

  const points: ReturningTrendPoint[] = ranges.map(({ start, end, label }) => {
    const startKey = dateKey(start);
    const endKey = dateKey(end);
    const preWindowStartKey = dateKey(new Date(start.getTime() - RESURRECTION_THRESHOLD_DAYS * 86400000));
    const preWindowEndKey = dateKey(new Date(start.getTime() - 86400000));

    let newCount = 0;
    let returningCount = 0;
    let resurrectedCount = 0;

    for (const [userId, dates] of activityMap) {
      const activeInBucket = [...dates].some((d) => d >= startKey && d <= endKey);
      if (!activeInBucket) continue;

      const firstEver = firstEverKeyByUser.get(userId);
      if (firstEver && firstEver >= startKey && firstEver <= endKey) {
        newCount += 1;
        continue;
      }

      const activeInPreWindow = [...dates].some((d) => d >= preWindowStartKey && d <= preWindowEndKey);
      if (activeInPreWindow) returningCount += 1;
      else resurrectedCount += 1;
    }

    return { date: label, new: newCount, returning: returningCount, resurrected: resurrectedCount };
  });

  return { granularity, points };
}

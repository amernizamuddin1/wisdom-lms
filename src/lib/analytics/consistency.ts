import "server-only";
import { getMeaningfulActivityDateKeys, getMeaningfulActivityDateKeysForCourse } from "./shared";
import type { ResolvedRange } from "./date-range";

export type ConsistencyMetrics = {
  averageActiveDays: number;
  medianActiveDays: number;
  distribution: { bucket: "1" | "2-3" | "4-7" | "8+"; count: number }[];
  averageDaysBetweenSessions: number | null;
  returnWithin7DaysPercent: number;
  returnWithin30DaysPercent: number;
};

export function bucketFor(days: number): "1" | "2-3" | "4-7" | "8+" {
  if (days <= 1) return "1";
  if (days <= 3) return "2-3";
  if (days <= 7) return "4-7";
  return "8+";
}

export async function getConsistencyMetrics(range: ResolvedRange, courseId: string | null): Promise<ConsistencyMetrics> {
  const byUser = courseId
    ? await getMeaningfulActivityDateKeysForCourse(range.from, range.to, courseId)
    : await getMeaningfulActivityDateKeys(range.from, range.to);

  const activeDayCounts: number[] = [];
  const bucketCounts: Record<"1" | "2-3" | "4-7" | "8+", number> = { "1": 0, "2-3": 0, "4-7": 0, "8+": 0 };
  const gapsAllUsers: number[] = [];
  let returnedWithin7 = 0;
  let returnedWithin30 = 0;
  let learnersWithMultipleDays = 0;

  for (const dates of byUser.values()) {
    const sorted = [...dates].sort();
    const count = sorted.length;
    activeDayCounts.push(count);
    bucketCounts[bucketFor(count)] += 1;

    if (count >= 2) {
      learnersWithMultipleDays += 1;
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
        const curr = new Date(`${sorted[i]}T00:00:00Z`).getTime();
        gaps.push(Math.round((curr - prev) / 86400000));
      }
      for (const g of gaps) gapsAllUsers.push(g);

      const firstGap = gaps[0];
      if (firstGap <= 7) returnedWithin7 += 1;
      if (firstGap <= 30) returnedWithin30 += 1;
    }
  }

  const totalActive = activeDayCounts.length;
  const averageActiveDays = totalActive === 0 ? 0 : Math.round((activeDayCounts.reduce((s, v) => s + v, 0) / totalActive) * 10) / 10;

  const sortedCounts = [...activeDayCounts].sort((a, b) => a - b);
  const medianActiveDays =
    sortedCounts.length === 0
      ? 0
      : sortedCounts.length % 2 === 1
        ? sortedCounts[(sortedCounts.length - 1) / 2]
        : Math.round(((sortedCounts[sortedCounts.length / 2 - 1] + sortedCounts[sortedCounts.length / 2]) / 2) * 10) / 10;

  const averageDaysBetweenSessions = gapsAllUsers.length === 0 ? null : Math.round((gapsAllUsers.reduce((s, v) => s + v, 0) / gapsAllUsers.length) * 10) / 10;

  return {
    averageActiveDays,
    medianActiveDays,
    distribution: (["1", "2-3", "4-7", "8+"] as const).map((bucket) => ({ bucket, count: bucketCounts[bucket] })),
    averageDaysBetweenSessions,
    returnWithin7DaysPercent: learnersWithMultipleDays === 0 ? 0 : Math.round((returnedWithin7 / learnersWithMultipleDays) * 1000) / 10,
    returnWithin30DaysPercent: learnersWithMultipleDays === 0 ? 0 : Math.round((returnedWithin30 / learnersWithMultipleDays) * 1000) / 10,
  };
}

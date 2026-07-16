import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey, changePercent, type ResolvedRange } from "./date-range";
import { downsample, bucketCountByDay, getMeaningfulActivityDateKeys, getMeaningfulActivityDateKeysForCourse } from "./shared";
import { getAllLearnerSegments } from "./learner-segments";

export type EngagementFilters = { range: ResolvedRange; courseId: string | null };

export type KpiValue = {
  value: number;
  previousValue: number | null;
  changePercent: number | null;
  sparkline: number[];
};

export type EngagementKpis = {
  dau: KpiValue;
  wau: KpiValue;
  mau: KpiValue;
  /** Percent (0-100), not a raw 0-1 ratio. */
  stickiness: KpiValue;
  avgActiveDaysPerLearner: KpiValue;
  avgLearningMinutesPerActiveLearner: KpiValue;
  /** Percent (0-100). */
  returningLearnerRate: KpiValue;
  atRiskLearners: KpiValue;
};

function kpi(value: number, previousValue: number | null, sparkline: number[] = []): KpiValue {
  return {
    value,
    previousValue,
    changePercent: previousValue === null ? null : changePercent(value, previousValue),
    sparkline,
  };
}

function countActiveAsOf(byUser: Map<string, Set<string>>, windowStartKey: string, cutoffKey: string): number {
  let count = 0;
  for (const dates of byUser.values()) {
    for (const d of dates) {
      if (d >= windowStartKey && d <= cutoffKey) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

async function getActivityMap(from: Date, to: Date, courseId: string | null): Promise<Map<string, Set<string>>> {
  return courseId ? getMeaningfulActivityDateKeysForCourse(from, to, courseId) : getMeaningfulActivityDateKeys(from, to);
}

// DAU/WAU/MAU are point-in-time metrics "as of" a cutoff date, per the
// product definitions in definitions.ts — not summed across the selected
// range. The comparison value is the same metric as of the previous period's
// cutoff, mirroring overview.ts's totalLearnersAsOf() idiom.
async function dauWauMauAsOf(cutoff: Date, courseId: string | null): Promise<{ dau: number; wau: number; mau: number }> {
  const cutoffKey = dateKey(cutoff);
  const wauStartKey = dateKey(new Date(cutoff.getTime() - 6 * 86400000));
  const mauStartKey = dateKey(new Date(cutoff.getTime() - 29 * 86400000));
  const map = await getActivityMap(new Date(cutoff.getTime() - 29 * 86400000), cutoff, courseId);
  return {
    dau: countActiveAsOf(map, cutoffKey, cutoffKey),
    wau: countActiveAsOf(map, wauStartKey, cutoffKey),
    mau: countActiveAsOf(map, mauStartKey, cutoffKey),
  };
}

export async function getEngagementKpis({ range, courseId }: EngagementFilters): Promise<EngagementKpis> {
  const { from, to, previousTo } = range;

  const [nowMetrics, prevMetrics, rangeMap, prevRangeMap, segments] = await Promise.all([
    dauWauMauAsOf(to, courseId),
    dauWauMauAsOf(previousTo, courseId),
    getActivityMap(from, to, courseId),
    getActivityMap(range.previousFrom, range.previousTo, courseId),
    getAllLearnerSegments(),
  ]);

  const stickinessNow = nowMetrics.mau === 0 ? 0 : Math.round((nowMetrics.dau / nowMetrics.mau) * 1000) / 10;
  const stickinessPrev = prevMetrics.mau === 0 ? null : Math.round((prevMetrics.dau / prevMetrics.mau) * 1000) / 10;

  const activeLearnerIds = [...rangeMap.keys()];
  const activeCountNow = activeLearnerIds.length;
  const activeCountPrev = prevRangeMap.size;

  const totalActiveDaysNow = activeLearnerIds.reduce((sum, id) => sum + (rangeMap.get(id)?.size ?? 0), 0);
  const avgActiveDaysNow = activeCountNow === 0 ? 0 : Math.round((totalActiveDaysNow / activeCountNow) * 10) / 10;
  const totalActiveDaysPrev = [...prevRangeMap.values()].reduce((sum, s) => sum + s.size, 0);
  const avgActiveDaysPrev = activeCountPrev === 0 ? null : Math.round((totalActiveDaysPrev / activeCountPrev) * 10) / 10;

  const learningMinutes = courseId
    ? { now: 0, prev: 0 } // per-course learning time has no range-bound source (see definitions.ts)
    : await getLearningMinutesTotals(from, to, range.previousFrom, previousTo);
  const avgMinutesNow = activeCountNow === 0 ? 0 : Math.round(learningMinutes.now / activeCountNow);
  const avgMinutesPrev = activeCountPrev === 0 ? null : Math.round(learningMinutes.prev / activeCountPrev);

  const [returningNow, returningPrev] = await Promise.all([
    getReturningLearnerCount(activeLearnerIds, from),
    getReturningLearnerCount([...prevRangeMap.keys()], range.previousFrom),
  ]);
  const returningRateNow = activeCountNow === 0 ? 0 : Math.round((returningNow / activeCountNow) * 1000) / 10;
  const returningRatePrev = activeCountPrev === 0 ? null : Math.round((returningPrev / activeCountPrev) * 1000) / 10;

  const atRiskNow = [...segments.values()].filter((s) => s === "AT_RISK").length;

  const dauSeries = dailyActiveSeries(rangeMap, from, to);

  return {
    dau: kpi(nowMetrics.dau, prevMetrics.dau, downsample(dauSeries)),
    wau: kpi(nowMetrics.wau, prevMetrics.wau),
    mau: kpi(nowMetrics.mau, prevMetrics.mau),
    stickiness: kpi(stickinessNow, stickinessPrev),
    avgActiveDaysPerLearner: kpi(avgActiveDaysNow, avgActiveDaysPrev),
    avgLearningMinutesPerActiveLearner: kpi(avgMinutesNow, avgMinutesPrev),
    returningLearnerRate: kpi(returningRateNow, returningRatePrev),
    atRiskLearners: kpi(atRiskNow, null),
  };
}

function dailyActiveSeries(byUser: Map<string, Set<string>>, from: Date, to: Date): number[] {
  const dates: Date[] = [];
  for (const set of byUser.values()) {
    for (const key of set) {
      dates.push(new Date(`${key}T00:00:00Z`));
    }
  }
  return bucketCountByDay(dates, from, to).map((d) => d.count);
}

async function getLearningMinutesTotals(from: Date, to: Date, prevFrom: Date, prevTo: Date): Promise<{ now: number; prev: number }> {
  const [now, prev] = await Promise.all([
    prisma.userDailyLearningActivity.aggregate({
      where: { activityDate: { gte: dateKey(from), lte: dateKey(to) } },
      _sum: { learningTimeSeconds: true },
    }),
    prisma.userDailyLearningActivity.aggregate({
      where: { activityDate: { gte: dateKey(prevFrom), lte: dateKey(prevTo) } },
      _sum: { learningTimeSeconds: true },
    }),
  ]);
  return { now: (now._sum.learningTimeSeconds ?? 0) / 60, prev: (prev._sum.learningTimeSeconds ?? 0) / 60 };
}

// A learner counts as "returning" for the period if they had a qualifying
// learning day, or a meaningful community event, strictly before `from`.
export async function getReturningLearnerCount(activeLearnerIds: string[], from: Date): Promise<number> {
  if (activeLearnerIds.length === 0) return 0;
  const beforeKey = dateKey(from);
  const [learningPrior, communityPrior] = await Promise.all([
    prisma.userDailyLearningActivity.findMany({
      where: { userId: { in: activeLearnerIds }, activityDate: { lt: beforeKey }, isQualifyingDay: true },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userActivityEvent.findMany({
      where: { userId: { in: activeLearnerIds }, createdAt: { lt: from }, type: { in: ["DISCUSSION_POST_CREATED", "DISCUSSION_REPLY_CREATED"] } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);
  return new Set([...learningPrior, ...communityPrior].map((r) => r.userId)).size;
}

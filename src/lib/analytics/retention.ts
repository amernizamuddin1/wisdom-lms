import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey } from "./date-range";
import { getMeaningfulActivityDateKeys } from "./shared";

export type CohortGranularity = "week" | "month";

export type CohortPeriod = { period: number; retentionPercent: number | null; retainedCount: number | null };
export type CohortRow = { cohortLabel: string; cohortStart: string; cohortSize: number; periods: CohortPeriod[] };

const MAX_COHORTS = 12;
const MAX_PERIODS = 8;

function startOfWeekUTC(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const day = x.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday-start week
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addPeriod(d: Date, granularity: CohortGranularity, count: number): Date {
  const x = new Date(d);
  if (granularity === "week") x.setUTCDate(x.getUTCDate() + 7 * count);
  else x.setUTCMonth(x.getUTCMonth() + count);
  return x;
}

function cohortLabel(d: Date, granularity: CohortGranularity): string {
  if (granularity === "month") return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return `Week of ${dateKey(d)}`;
}

// Cohorts group learners by the calendar week/month of their first-ever
// enrollment (RETENTION_COHORT_BASIS in definitions.ts). Course-scoped view
// uses the first enrollment in that specific course. "Retained" for period N
// means >=1 meaningful activity day within that cohort-relative window — see
// definitions.ts. Never backfilled beyond what Enrollment/activity data
// already contains; periods a cohort hasn't reached yet are left null, not 0%.
export async function getRetentionCohorts(params: {
  granularity: CohortGranularity;
  courseId: string | null;
}): Promise<{ rows: CohortRow[]; maxPeriods: number }> {
  const { granularity, courseId } = params;

  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE", ...(courseId ? { courseId } : {}) },
    select: { userId: true, enrolledAt: true },
    orderBy: { enrolledAt: "asc" },
  });
  if (enrollments.length === 0) return { rows: [], maxPeriods: 0 };

  const firstEnrollmentByUser = new Map<string, Date>();
  for (const e of enrollments) {
    if (!firstEnrollmentByUser.has(e.userId)) firstEnrollmentByUser.set(e.userId, e.enrolledAt);
  }

  const cohortStartFor = granularity === "week" ? startOfWeekUTC : startOfMonthUTC;
  const usersByCohort = new Map<string, string[]>();
  for (const [userId, firstDate] of firstEnrollmentByUser) {
    const start = cohortStartFor(firstDate);
    const key = start.toISOString();
    const arr = usersByCohort.get(key) ?? [];
    arr.push(userId);
    usersByCohort.set(key, arr);
  }

  const now = new Date();
  const cohortKeys = [...usersByCohort.keys()].sort().slice(-MAX_COHORTS);
  if (cohortKeys.length === 0) return { rows: [], maxPeriods: 0 };

  const earliestCohortStart = new Date(cohortKeys[0]);
  const overallMaxPeriods = Math.min(
    MAX_PERIODS,
    granularity === "week"
      ? Math.floor((now.getTime() - earliestCohortStart.getTime()) / (7 * 86400000))
      : (now.getUTCFullYear() - earliestCohortStart.getUTCFullYear()) * 12 + (now.getUTCMonth() - earliestCohortStart.getUTCMonth()),
  );

  const activityMap = await getMeaningfulActivityDateKeys(earliestCohortStart, now);

  const rows: CohortRow[] = cohortKeys.map((key) => {
    const start = new Date(key);
    const userIds = usersByCohort.get(key) ?? [];
    const cohortSize = userIds.length;

    const periodsReachable = Math.min(
      MAX_PERIODS,
      granularity === "week"
        ? Math.floor((now.getTime() - start.getTime()) / (7 * 86400000))
        : (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth()),
    );

    const periods: CohortPeriod[] = [];
    for (let period = 0; period <= overallMaxPeriods; period++) {
      if (period > periodsReachable) {
        periods.push({ period, retentionPercent: null, retainedCount: null });
        continue;
      }
      const periodStartKey = dateKey(addPeriod(start, granularity, period));
      const periodEndKey = dateKey(new Date(addPeriod(start, granularity, period + 1).getTime() - 1));

      let retainedCount = 0;
      for (const userId of userIds) {
        const dates = activityMap.get(userId);
        if (!dates) continue;
        for (const d of dates) {
          if (d >= periodStartKey && d <= periodEndKey) {
            retainedCount += 1;
            break;
          }
        }
      }
      periods.push({
        period,
        retentionPercent: cohortSize === 0 ? 0 : Math.round((retainedCount / cohortSize) * 1000) / 10,
        retainedCount,
      });
    }

    return { cohortLabel: cohortLabel(start, granularity), cohortStart: dateKey(start), cohortSize, periods };
  });

  return { rows, maxPeriods: overallMaxPeriods };
}

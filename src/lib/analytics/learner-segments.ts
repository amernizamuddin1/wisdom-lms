import "server-only";
import { prisma } from "@/lib/prisma";
import { getAnalyticsSettings, type AnalyticsSettings } from "./settings";
import { SLOWING_DOWN_DROP_RATIO, HIGHLY_ENGAGED_MIN_STREAK_DAYS, HIGHLY_ENGAGED_MIN_QUALIFYING_DAYS_30 } from "./definitions";
import { dateKey, daysAgo } from "./date-range";
import { getTenantStudentMemberships } from "./tenant-learners";

export type EngagementSegment = "DORMANT" | "AT_RISK" | "SLOWING_DOWN" | "HIGHLY_ENGAGED" | "ACTIVE";

export const SEGMENT_LABELS: Record<EngagementSegment, string> = {
  DORMANT: "Dormant",
  AT_RISK: "At Risk",
  SLOWING_DOWN: "Slowing Down",
  HIGHLY_ENGAGED: "Highly Engaged",
  ACTIVE: "Active",
};

export const SEGMENT_ORDER: EngagementSegment[] = ["HIGHLY_ENGAGED", "ACTIVE", "SLOWING_DOWN", "AT_RISK", "DORMANT"];

type LearnerSignals = {
  userId: string;
  joinedAt: Date;
  currentStreak: number;
  daysSinceLastQualifying: number | null;
  qualifyingDaysRecentWindow: number;
  qualifyingDaysPriorWindow: number;
  qualifyingDaysLast30: number;
  hasIncompleteCourse: boolean;
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export function classifySegment(signals: LearnerSignals, settings: AnalyticsSettings): EngagementSegment {
  const { joinedAt, currentStreak, daysSinceLastQualifying, qualifyingDaysRecentWindow, qualifyingDaysPriorWindow, qualifyingDaysLast30, hasIncompleteCourse } = signals;
  const accountAgeDays = daysBetween(new Date(), joinedAt);

  const isDormant = (daysSinceLastQualifying === null || daysSinceLastQualifying > settings.dormantDays) && accountAgeDays > settings.dormantDays;
  if (isDormant) return "DORMANT";

  const isAtRisk = hasIncompleteCourse && (daysSinceLastQualifying === null || daysSinceLastQualifying > settings.atRiskDays);
  if (isAtRisk) return "AT_RISK";

  const bothWindowsElapsed = accountAgeDays >= settings.slowingDownDays * 2;
  const isSlowingDown =
    bothWindowsElapsed &&
    qualifyingDaysPriorWindow > 0 &&
    qualifyingDaysRecentWindow <= qualifyingDaysPriorWindow * (1 - SLOWING_DOWN_DROP_RATIO);
  if (isSlowingDown) return "SLOWING_DOWN";

  const isActiveWindow = daysSinceLastQualifying !== null && daysSinceLastQualifying <= settings.activeWindowDays;
  if (isActiveWindow && (currentStreak >= HIGHLY_ENGAGED_MIN_STREAK_DAYS || qualifyingDaysLast30 >= HIGHLY_ENGAGED_MIN_QUALIFYING_DAYS_30)) {
    return "HIGHLY_ENGAGED";
  }

  return "ACTIVE";
}

export type LearnerSegmentResult = { userId: string; segment: EngagementSegment };

// Batch-classifies every student in as few queries as possible — designed to
// scale with learner count via groupBy/count, not one query per learner.
export async function getAllLearnerSegments(): Promise<Map<string, EngagementSegment>> {
  const settings = await getAnalyticsSettings();

  const [members, profiles, enrollmentCounts, completedCourseEvents, recentActivity] = await Promise.all([
    getTenantStudentMemberships(),
    prisma.userGamificationProfile.findMany({ select: { userId: true, currentStreak: true, lastQualifyingDate: true } }),
    prisma.enrollment.groupBy({ by: ["userId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
    prisma.userActivityEvent.groupBy({ by: ["userId"], where: { type: "COURSE_COMPLETED" }, _count: { _all: true } }),
    prisma.userDailyLearningActivity.findMany({
      where: { activityDate: { gte: dateKey(daysAgo(Math.max(29, settings.slowingDownDays * 2 - 1))) }, isQualifyingDay: true },
      select: { userId: true, activityDate: true },
    }),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
  const enrollmentCountByUser = new Map(enrollmentCounts.map((e) => [e.userId, e._count._all]));
  const completedCountByUser = new Map(completedCourseEvents.map((e) => [e.userId, e._count._all]));

  const recentWindowStart = dateKey(daysAgo(settings.slowingDownDays - 1));
  const priorWindowStart = dateKey(daysAgo(settings.slowingDownDays * 2 - 1));
  const priorWindowEnd = dateKey(daysAgo(settings.slowingDownDays));
  const last30Start = dateKey(daysAgo(29));

  const activityByUser = new Map<string, string[]>();
  for (const row of recentActivity) {
    const arr = activityByUser.get(row.userId) ?? [];
    arr.push(row.activityDate);
    activityByUser.set(row.userId, arr);
  }

  const result = new Map<string, EngagementSegment>();
  const today = dateKey(new Date());

  for (const member of members) {
    const profile = profileByUser.get(member.userId);
    const dates = activityByUser.get(member.userId) ?? [];

    const lastQualifyingDate = profile?.lastQualifyingDate ?? null;
    const daysSinceLastQualifying = lastQualifyingDate
      ? daysBetween(new Date(`${today}T00:00:00Z`), new Date(`${lastQualifyingDate}T00:00:00Z`))
      : null;

    const qualifyingDaysRecentWindow = dates.filter((d) => d >= recentWindowStart).length;
    const qualifyingDaysPriorWindow = dates.filter((d) => d >= priorWindowStart && d <= priorWindowEnd).length;
    const qualifyingDaysLast30 = dates.filter((d) => d >= last30Start).length;

    const enrollments = enrollmentCountByUser.get(member.userId) ?? 0;
    const completedCourses = completedCountByUser.get(member.userId) ?? 0;

    const segment = classifySegment(
      {
        userId: member.userId,
        joinedAt: member.createdAt,
        currentStreak: profile?.currentStreak ?? 0,
        daysSinceLastQualifying,
        qualifyingDaysRecentWindow,
        qualifyingDaysPriorWindow,
        qualifyingDaysLast30,
        hasIncompleteCourse: enrollments > completedCourses,
      },
      settings,
    );

    result.set(member.userId, segment);
  }

  return result;
}

export async function getEngagementDistribution(): Promise<{ segment: EngagementSegment; label: string; count: number }[]> {
  const segments = await getAllLearnerSegments();
  const counts: Record<EngagementSegment, number> = { DORMANT: 0, AT_RISK: 0, SLOWING_DOWN: 0, HIGHLY_ENGAGED: 0, ACTIVE: 0 };
  for (const segment of segments.values()) counts[segment] += 1;
  return SEGMENT_ORDER.map((segment) => ({ segment, label: SEGMENT_LABELS[segment], count: counts[segment] }));
}

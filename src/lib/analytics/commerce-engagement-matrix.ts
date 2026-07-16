import "server-only";
import type { ResolvedRange } from "./date-range";
import { getCoursePerformanceRows } from "./courses";
import { REVENUE_ENGAGEMENT_QUADRANTS, type RevenueEngagementQuadrant } from "./definitions";

export type RevenueEngagementCourseRow = {
  courseId: string;
  title: string;
  revenue: number;
  completionRate: number;
  quadrant: RevenueEngagementQuadrant;
};

export type RevenueEngagementMatrixResult = {
  medianRevenue: number;
  medianCompletionRate: number;
  courses: RevenueEngagementCourseRow[];
};

// Standard median: sort, average the two middle values on an even-length
// array. An empty input has no meaningful median — callers only ever see
// this when there are zero courses, in which case every course is trivially
// "low" against a median of 0.
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function classify(revenue: number, completionRate: number, medianRevenue: number, medianCompletionRate: number): RevenueEngagementQuadrant {
  const highRevenue = revenue >= medianRevenue;
  const highEngagement = completionRate >= medianCompletionRate;
  if (highRevenue && highEngagement) return REVENUE_ENGAGEMENT_QUADRANTS[0];
  if (highRevenue && !highEngagement) return REVENUE_ENGAGEMENT_QUADRANTS[1];
  if (!highRevenue && highEngagement) return REVENUE_ENGAGEMENT_QUADRANTS[2];
  return REVENUE_ENGAGEMENT_QUADRANTS[3];
}

// Revenue-vs-engagement quadrant matrix for the Commercial Intelligence
// overview — reuses getCoursePerformanceRows (Phase 1's single source of
// per-course completionRate/revenue) rather than recomputing either figure,
// so this view can never silently drift from the Course Performance table.
// "High" is always relative to the current platform median, not a fixed
// threshold, per REVENUE_ENGAGEMENT_QUADRANT_LABELS's definition.
export async function getRevenueVsEngagementMatrix(range: ResolvedRange): Promise<RevenueEngagementMatrixResult> {
  const courseRows = await getCoursePerformanceRows(null, range);

  const medianRevenue = median(courseRows.map((c) => c.revenue));
  const medianCompletionRate = median(courseRows.map((c) => c.completionRate));

  const courses: RevenueEngagementCourseRow[] = courseRows.map((c) => ({
    courseId: c.courseId,
    title: c.title,
    revenue: c.revenue,
    completionRate: c.completionRate,
    quadrant: classify(c.revenue, c.completionRate, medianRevenue, medianCompletionRate),
  }));

  return { medianRevenue, medianCompletionRate, courses };
}

import "server-only";
import type { ResolvedRange } from "./date-range";
import { getAtRiskSummary } from "./at-risk";
import { getActivityHeatmap, HEATMAP_DAY_LABELS } from "./heatmap";
import { getStreakEngagementComparison } from "./gamification-comparison";
import { getRetentionCohorts } from "./retention";

export type Insight = { id: string; text: string };

const MIN_HEATMAP_EVENTS_FOR_INSIGHT = 20;

// Every insight here is a plain arithmetic/lookup fact from the modules
// already backing the dashboards — no AI, no causal language (correlation
// findings say "show" / "is associated with", never "caused"), and each is
// gated by a minimum-sample check so a quiet week doesn't produce a
// misleadingly confident sentence. Capped to 5 to keep the panel scannable.
export async function getDeterministicInsights(range: ResolvedRange): Promise<Insight[]> {
  const insights: Insight[] = [];

  const [atRisk, heatmap, streakComparison, cohorts] = await Promise.all([
    getAtRiskSummary(range),
    getActivityHeatmap({ range, courseId: null, activityType: "all" }),
    getStreakEngagementComparison(range),
    getRetentionCohorts({ granularity: "month", courseId: null }),
  ]);

  if (atRisk.newlyAtRisk > 0 || atRisk.recovered > 0) {
    insights.push({
      id: "at-risk-movement",
      text: `${atRisk.newlyAtRisk} learner${atRisk.newlyAtRisk === 1 ? "" : "s"} became newly at-risk this period, while ${atRisk.recovered} recovered to Active or better.`,
    });
  }

  const totalHeatmapEvents = heatmap.cells.reduce((s, c) => s + c.events, 0);
  if (totalHeatmapEvents >= MIN_HEATMAP_EVENTS_FOR_INSIGHT) {
    const peak = heatmap.cells.reduce((best, c) => (c.events > best.events ? c : best), heatmap.cells[0]);
    if (peak.events > 0) {
      const hourLabel = `${peak.hour.toString().padStart(2, "0")}:00–${((peak.hour + 1) % 24).toString().padStart(2, "0")}:00`;
      insights.push({
        id: "peak-activity-window",
        text: `${HEATMAP_DAY_LABELS[peak.dayOfWeek]} between ${hourLabel} (learner-local time) is the highest-activity window, with ${peak.uniqueLearners} unique learners active.`,
      });
    }
  }

  if (!streakComparison.suppressed) {
    const completionMetric = streakComparison.metrics.find((m) => m.label === "Completion rate");
    if (completionMetric && completionMetric.withGroupValue > completionMetric.withoutGroupValue) {
      const delta = Math.round((completionMetric.withGroupValue - completionMetric.withoutGroupValue) * 10) / 10;
      insights.push({
        id: "streak-completion-correlation",
        text: `Learners with an active streak show a ${delta} percentage point higher completion rate in the selected period (${streakComparison.withGroupSize} vs. ${streakComparison.withoutGroupSize} learners) — an association, not a proven cause.`,
      });
    }
  }

  if (cohorts.rows.length >= 2 && cohorts.maxPeriods >= 1) {
    const comparablePeriod = Math.min(cohorts.maxPeriods, 4);
    const sorted = [...cohorts.rows].sort((a, b) => a.cohortStart.localeCompare(b.cohortStart));
    const latestTwo = sorted.slice(-2);
    const [older, newer] = latestTwo;
    const olderPeriod = older.periods.find((p) => p.period === comparablePeriod);
    const newerPeriod = newer.periods.find((p) => p.period === comparablePeriod);
    if (olderPeriod?.retentionPercent != null && newerPeriod?.retentionPercent != null && older.cohortSize >= 5 && newer.cohortSize >= 5) {
      const delta = Math.round((newerPeriod.retentionPercent - olderPeriod.retentionPercent) * 10) / 10;
      if (Math.abs(delta) >= 1) {
        insights.push({
          id: "cohort-retention-delta",
          text: `The ${newer.cohortLabel} cohort retained ${Math.abs(delta)} percentage points ${delta > 0 ? "better" : "worse"} than the ${older.cohortLabel} cohort at Month ${comparablePeriod}.`,
        });
      }
    }
  }

  return insights.slice(0, 5);
}

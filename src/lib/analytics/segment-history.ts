import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey, type ResolvedRange } from "./date-range";
import { SEGMENT_LABELS, type EngagementSegment } from "./learner-segments";

export type SegmentTransition = { from: EngagementSegment; to: EngagementSegment; count: number };

export type SegmentTransitionsResult =
  | { insufficientData: true; firstSnapshotDate: string | null }
  | {
      insufficientData: false;
      earlierDate: string;
      laterDate: string;
      transitions: SegmentTransition[];
      recovered: number; // AT_RISK/DORMANT -> ACTIVE/HIGHLY_ENGAGED
      newlyAtRisk: number; // any -> AT_RISK
    };

const RECOVERY_FROM: EngagementSegment[] = ["AT_RISK", "DORMANT"];
const RECOVERY_TO: EngagementSegment[] = ["ACTIVE", "HIGHLY_ENGAGED"];

// Segment history only exists from the day the snapshot cron first ran in
// this deployment — see prisma schema comment on UserSegmentSnapshot and
// /api/cron/segment-snapshot. This never backfills; it just reports
// "insufficient data" until at least two distinct snapshot dates exist
// inside the requested range.
export async function getSegmentTransitions(range: ResolvedRange): Promise<SegmentTransitionsResult> {
  const fromKey = dateKey(range.from);
  const toKey = dateKey(range.to);

  const distinctDates = await prisma.userSegmentSnapshot.findMany({
    where: { snapshotDate: { gte: fromKey, lte: toKey } },
    distinct: ["snapshotDate"],
    select: { snapshotDate: true },
    orderBy: { snapshotDate: "asc" },
  });

  if (distinctDates.length < 2) {
    const earliestOverall = await prisma.userSegmentSnapshot.findFirst({
      orderBy: { snapshotDate: "asc" },
      select: { snapshotDate: true },
    });
    return { insufficientData: true, firstSnapshotDate: earliestOverall?.snapshotDate ?? null };
  }

  const earlierDate = distinctDates[0].snapshotDate;
  const laterDate = distinctDates[distinctDates.length - 1].snapshotDate;

  const [earlierRows, laterRows] = await Promise.all([
    prisma.userSegmentSnapshot.findMany({ where: { snapshotDate: earlierDate }, select: { userId: true, segment: true } }),
    prisma.userSegmentSnapshot.findMany({ where: { snapshotDate: laterDate }, select: { userId: true, segment: true } }),
  ]);

  const earlierByUser = new Map(earlierRows.map((r) => [r.userId, r.segment as EngagementSegment]));
  const laterByUser = new Map(laterRows.map((r) => [r.userId, r.segment as EngagementSegment]));

  const counts = new Map<string, number>();
  let recovered = 0;
  let newlyAtRisk = 0;

  for (const [userId, fromSegment] of earlierByUser) {
    const toSegment = laterByUser.get(userId);
    if (!toSegment || toSegment === fromSegment) continue;
    const key = `${fromSegment}->${toSegment}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (RECOVERY_FROM.includes(fromSegment) && RECOVERY_TO.includes(toSegment)) recovered += 1;
    if (toSegment === "AT_RISK" && fromSegment !== "AT_RISK") newlyAtRisk += 1;
  }

  const transitions: SegmentTransition[] = [...counts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("->") as [EngagementSegment, EngagementSegment];
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count);

  return { insufficientData: false, earlierDate, laterDate, transitions, recovered, newlyAtRisk };
}

export function describeTransition(t: SegmentTransition): string {
  return `${t.count} learner${t.count === 1 ? "" : "s"} moved from ${SEGMENT_LABELS[t.from]} to ${SEGMENT_LABELS[t.to]}`;
}

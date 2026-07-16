import "server-only";
import { prisma } from "@/lib/prisma";
import type { ActivityEventType } from "@/generated/prisma/enums";
import type { ResolvedRange } from "./date-range";
import { getDateKeyForUser, getHourForUser } from "@/lib/gamification/timezone";
import { FALLBACK_TIMEZONE, COMMUNITY_MEANINGFUL_EVENT_TYPES } from "./definitions";
import { ANALYTICS_ROW_CAP } from "./shared";

export type HeatmapActivityType = "all" | "learning" | "quiz" | "community";

export type HeatmapCell = { dayOfWeek: number; hour: number; uniqueLearners: number; events: number };

const LEARNING_TYPES: ActivityEventType[] = ["LESSON_STARTED", "LESSON_COMPLETED", "MODULE_COMPLETED", "COURSE_COMPLETED", "VIDEO_WATCH_PROGRESS"];
const QUIZ_TYPES: ActivityEventType[] = ["QUIZ_STARTED", "QUIZ_COMPLETED", "QUIZ_PASSED", "QUIZ_HIGH_SCORE", "QUIZ_PERFECT_SCORE"];
const COMMUNITY_TYPES: ActivityEventType[] = [...COMMUNITY_MEANINGFUL_EVENT_TYPES];

function typesFor(activityType: HeatmapActivityType): ActivityEventType[] {
  switch (activityType) {
    case "learning":
      return LEARNING_TYPES;
    case "quiz":
      return QUIZ_TYPES;
    case "community":
      return COMMUNITY_TYPES;
    default:
      return [...LEARNING_TYPES, ...QUIZ_TYPES, ...COMMUNITY_TYPES];
  }
}

// Day-of-week x hour-of-day grid in each learner's *local* time. There's no
// hour-of-day signal in the daily rollup table (UserDailyLearningActivity is
// day-grained only), so this reads raw UserActivityEvent timestamps —
// bounded by ANALYTICS_ROW_CAP like every other raw-row aggregation here.
export async function getActivityHeatmap(params: {
  range: ResolvedRange;
  courseId: string | null;
  activityType: HeatmapActivityType;
}): Promise<{ cells: HeatmapCell[]; truncated: boolean }> {
  const { range, courseId, activityType } = params;
  const types = typesFor(activityType);

  const rows = await prisma.userActivityEvent.findMany({
    where: {
      type: { in: types },
      createdAt: { gte: range.from, lte: range.to },
      ...(courseId ? { courseId } : {}),
    },
    select: { userId: true, createdAt: true },
    take: ANALYTICS_ROW_CAP,
  });

  if (rows.length === 0) return { cells: [], truncated: false };

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, timezone: true } });
  const tzByUser = new Map(users.map((u) => [u.id, u.timezone || FALLBACK_TIMEZONE]));

  const cellMap = new Map<string, { learners: Set<string>; events: number }>();
  for (const row of rows) {
    const tz = tzByUser.get(row.userId) ?? FALLBACK_TIMEZONE;
    const localDateKey = getDateKeyForUser(row.createdAt, tz);
    const [y, m, d] = localDateKey.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const hour = getHourForUser(row.createdAt, tz);
    const key = `${dayOfWeek}:${hour}`;
    const cell = cellMap.get(key) ?? { learners: new Set<string>(), events: 0 };
    cell.learners.add(row.userId);
    cell.events += 1;
    cellMap.set(key, cell);
  }

  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const cell = cellMap.get(`${day}:${hour}`);
      cells.push({ dayOfWeek: day, hour, uniqueLearners: cell?.learners.size ?? 0, events: cell?.events ?? 0 });
    }
  }

  return { cells, truncated: rows.length >= ANALYTICS_ROW_CAP };
}

export const HEATMAP_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

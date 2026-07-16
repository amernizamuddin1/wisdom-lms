import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey } from "./date-range";
import { getDateKeyForUser } from "@/lib/gamification/timezone";
import { COMMUNITY_MEANINGFUL_EVENT_TYPES, FALLBACK_TIMEZONE } from "./definitions";

// Every lesson id and quiz id that belongs to a course (course-level quizzes
// plus chapter-level quizzes) — the denominator for "progress"/"completion".
export async function getCourseItemIds(courseId: string): Promise<{ lessonIds: string[]; quizIds: string[] }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      chapters: { select: { lessons: { select: { id: true } }, quizzes: { select: { id: true } } } },
      quizzes: { where: { chapterId: null }, select: { id: true } },
    },
  });
  if (!course) return { lessonIds: [], quizIds: [] };
  return {
    lessonIds: course.chapters.flatMap((c) => c.lessons.map((l) => l.id)),
    quizIds: [...course.quizzes.map((q) => q.id), ...course.chapters.flatMap((c) => c.quizzes.map((q) => q.id))],
  };
}

// Buckets a fetched (bounded) set of timestamped rows into one count per
// calendar day across [from, to]. Used for chart series / KPI sparklines
// built from raw row fetches rather than a pre-aggregated rollup table.
export function bucketCountByDay(dates: Date[], from: Date, to: Date): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = dateKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: { date: string; count: number }[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = dateKey(cursor);
    days.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Downsamples a daily series to at most `maxPoints` values for compact KPI
// sparklines (charts render the full series; sparklines don't need every day).
export function downsample(values: number[], maxPoints = 20): number[] {
  if (values.length <= maxPoints) return values;
  const step = values.length / maxPoints;
  const out: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(values[Math.floor(i * step)]);
  }
  return out;
}

// Caps raw-row fetches used for in-JS bucketing/aggregation so a very large
// date range can't pull unbounded data into the server process.
export const ANALYTICS_ROW_CAP = 20000;

// Phase 2's single source of "meaningful activity day" per learner — see
// definitions.ts. Learning-side qualifying days come straight from
// UserDailyLearningActivity (already user-local-day-correct, written at
// event time by lib/gamification/events.ts). Community days are derived
// from UserActivityEvent.createdAt, converted to each learner's local date
// with their own User.timezone (falling back to FALLBACK_TIMEZONE only if a
// row is somehow missing one). Every DAU/WAU/MAU/heatmap/cohort/consistency
// query in this directory is built on top of this one function so the
// definition can't silently drift between pages.
export async function getMeaningfulActivityDateKeys(from: Date, to: Date): Promise<Map<string, Set<string>>> {
  const [learningRows, communityRows] = await Promise.all([
    prisma.userDailyLearningActivity.findMany({
      where: { activityDate: { gte: dateKey(from), lte: dateKey(to) }, isQualifyingDay: true },
      select: { userId: true, activityDate: true },
    }),
    prisma.userActivityEvent.findMany({
      where: { type: { in: [...COMMUNITY_MEANINGFUL_EVENT_TYPES] }, createdAt: { gte: from, lte: to } },
      select: { userId: true, createdAt: true },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  const byUser = new Map<string, Set<string>>();
  for (const row of learningRows) {
    const set = byUser.get(row.userId) ?? new Set<string>();
    set.add(row.activityDate);
    byUser.set(row.userId, set);
  }

  if (communityRows.length > 0) {
    const userIds = [...new Set(communityRows.map((r) => r.userId))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, timezone: true } });
    const tzByUser = new Map(users.map((u) => [u.id, u.timezone || FALLBACK_TIMEZONE]));
    for (const row of communityRows) {
      const tz = tzByUser.get(row.userId) ?? FALLBACK_TIMEZONE;
      const key = getDateKeyForUser(row.createdAt, tz);
      const set = byUser.get(row.userId) ?? new Set<string>();
      set.add(key);
      byUser.set(row.userId, set);
    }
  }

  return byUser;
}

// Course-scoped variant of getMeaningfulActivityDateKeys. There's no
// per-course daily rollup table (UserCourseLearningTime is an all-time
// cumulative total, not day-grained — see definitions.ts), so this reads
// raw UserActivityEvent rows for that course instead, same trade-off Phase
// 1's per-course activeLearnerCount() (overview.ts) already makes.
export async function getMeaningfulActivityDateKeysForCourse(from: Date, to: Date, courseId: string): Promise<Map<string, Set<string>>> {
  const rows = await prisma.userActivityEvent.findMany({
    where: {
      courseId,
      createdAt: { gte: from, lte: to },
      type: { in: ["LESSON_COMPLETED", "LESSON_STARTED", "QUIZ_COMPLETED", "MODULE_COMPLETED", "COURSE_COMPLETED"] },
    },
    select: { userId: true, createdAt: true },
    take: ANALYTICS_ROW_CAP,
  });
  if (rows.length === 0) return new Map();

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, timezone: true } });
  const tzByUser = new Map(users.map((u) => [u.id, u.timezone || FALLBACK_TIMEZONE]));

  const byUser = new Map<string, Set<string>>();
  for (const row of rows) {
    const tz = tzByUser.get(row.userId) ?? FALLBACK_TIMEZONE;
    const key = getDateKeyForUser(row.createdAt, tz);
    const set = byUser.get(row.userId) ?? new Set<string>();
    set.add(key);
    byUser.set(row.userId, set);
  }
  return byUser;
}

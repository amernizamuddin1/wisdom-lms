import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { classifyCourseEnrollments } from "./funnel";
import { getMeaningfulActivityDateKeysForCourse } from "./shared";
import { getReturningLearnerCount } from "./engagement";
import { getAllLearnerSegments } from "./learner-segments";

export type CourseEngagementRow = {
  courseId: string;
  title: string;
  enrollments: number;
  activeLearners: number;
  activeLearnerRatePercent: number;
  averageActiveDays: number;
  averageLearningMinutes: number; // all-time cumulative, see note below
  completionRatePercent: number;
  atRiskLearners: number;
  atRiskRatePercent: number;
  returningLearnerRatePercent: number;
  communityParticipationRatePercent: number | null;
};

export async function getCourseEngagementComparison(params: {
  range: ResolvedRange;
  search?: string;
  sort?: keyof CourseEngagementRow;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}): Promise<{ rows: CourseEngagementRow[]; total: number }> {
  const { range } = params;

  const courses = await prisma.course.findMany({
    where: params.search ? { title: { contains: params.search, mode: "insensitive" } } : {},
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const segments = await getAllLearnerSegments();

  const rows: CourseEngagementRow[] = await Promise.all(
    courses.map(async (course) => {
      const [classified, activityMap, learningTime, threads] = await Promise.all([
        classifyCourseEnrollments(course.id),
        getMeaningfulActivityDateKeysForCourse(range.from, range.to, course.id),
        prisma.userCourseLearningTime.aggregate({ where: { courseId: course.id }, _sum: { learningTimeSeconds: true } }),
        prisma.discussionThread.findMany({ where: { courseId: course.id }, select: { id: true } }),
      ]);

      const enrollments = classified.size;
      const completed = [...classified.values()].filter((c) => c.completed).length;
      const activeLearnerIds = [...activityMap.keys()];
      const activeLearners = activeLearnerIds.length;

      const totalActiveDays = activeLearnerIds.reduce((sum, id) => sum + (activityMap.get(id)?.size ?? 0), 0);
      const averageActiveDays = activeLearners === 0 ? 0 : Math.round((totalActiveDays / activeLearners) * 10) / 10;
      const averageLearningMinutes = enrollments === 0 ? 0 : Math.round((learningTime._sum.learningTimeSeconds ?? 0) / 60 / enrollments);

      const incompleteUserIds = [...classified.entries()].filter(([, c]) => !c.completed).map(([userId]) => userId);
      const atRiskLearners = incompleteUserIds.filter((userId) => segments.get(userId) === "AT_RISK").length;

      const returningCount = await getReturningLearnerCount(activeLearnerIds, range.from);

      let communityParticipationRatePercent: number | null = null;
      if (threads.length > 0) {
        const threadIds = threads.map((t) => t.id);
        const [threadAuthors, replyAuthors, answerAuthors] = await Promise.all([
          prisma.discussionThread.findMany({ where: { id: { in: threadIds }, createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
          prisma.discussionReply.findMany({ where: { threadId: { in: threadIds }, createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
          prisma.discussionAnswer.findMany({ where: { threadId: { in: threadIds }, createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
        ]);
        const participants = new Set([...threadAuthors, ...replyAuthors, ...answerAuthors].map((r) => r.authorId));
        communityParticipationRatePercent = enrollments === 0 ? 0 : Math.round((participants.size / enrollments) * 1000) / 10;
      }

      return {
        courseId: course.id,
        title: course.title,
        enrollments,
        activeLearners,
        activeLearnerRatePercent: enrollments === 0 ? 0 : Math.round((activeLearners / enrollments) * 1000) / 10,
        averageActiveDays,
        averageLearningMinutes,
        completionRatePercent: enrollments === 0 ? 0 : Math.round((completed / enrollments) * 1000) / 10,
        atRiskLearners,
        atRiskRatePercent: enrollments === 0 ? 0 : Math.round((atRiskLearners / enrollments) * 1000) / 10,
        returningLearnerRatePercent: activeLearners === 0 ? 0 : Math.round((returningCount / activeLearners) * 1000) / 10,
        communityParticipationRatePercent,
      };
    }),
  );

  const sort = params.sort ?? "enrollments";
  const dir = params.sortDir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return 0;
  });

  const total = rows.length;
  const pageSize = params.pageSize ?? 25;
  const page = Math.max(1, params.page ?? 1);
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKey, type ResolvedRange } from "./date-range";
import { MIN_COMPARISON_SAMPLE_SIZE } from "./definitions";
import { getMeaningfulActivityDateKeys } from "./shared";
import { getReturningLearnerCount } from "./engagement";
import type { ComparisonResult } from "./gamification-comparison";
import { countTenantStudents, getTenantStudentMemberships } from "./tenant-learners";

export type CommunityKpis = {
  activeParticipants: number;
  postsCreated: number;
  repliesCreated: number;
  participationRatePercent: number;
  helpfulAnswers: number;
  communityXpAwarded: number;
};

// Participation rate = unique learners with >=1 meaningful community action
// (post, answer, or reply) in range, divided by learners with >=1 active
// enrollment — the single definition documented in definitions.ts, used
// everywhere on this page.
export async function getCommunityKpis(range: ResolvedRange): Promise<CommunityKpis> {
  const [threads, answers, replies, acceptedAnswers, xpAgg, enrolledLearnerCount] = await Promise.all([
    prisma.discussionThread.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
    prisma.discussionAnswer.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
    prisma.discussionReply.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
    prisma.discussionAnswer.count({ where: { isAccepted: true, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.userXpTransaction.aggregate({
      where: { createdAt: { gte: range.from, lte: range.to }, isReversed: false, amount: { gt: 0 }, ruleCode: { startsWith: "DISCUSSION" } },
      _sum: { amount: true },
    }),
    prisma.enrollment.findMany({ where: { status: "ACTIVE" }, distinct: ["userId"], select: { userId: true } }),
  ]);

  const participants = new Set([...threads, ...answers, ...replies].map((r) => r.authorId));

  return {
    activeParticipants: participants.size,
    postsCreated: threads.length,
    repliesCreated: answers.length + replies.length,
    participationRatePercent: enrolledLearnerCount.length === 0 ? 0 : Math.round((participants.size / enrolledLearnerCount.length) * 1000) / 10,
    helpfulAnswers: acceptedAnswers,
    communityXpAwarded: xpAgg._sum.amount ?? 0,
  };
}

export type CommunityTrendPoint = { date: string; posts: number; replies: number; participants: number };

export async function getCommunityActivityTrend(range: ResolvedRange): Promise<CommunityTrendPoint[]> {
  const [threads, answers, replies] = await Promise.all([
    prisma.discussionThread.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true, createdAt: true } }),
    prisma.discussionAnswer.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true, createdAt: true } }),
    prisma.discussionReply.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true, createdAt: true } }),
  ]);

  const byDay = new Map<string, { posts: number; replies: number; participants: Set<string> }>();
  const bump = (createdAt: Date, authorId: string, isPost: boolean) => {
    const key = dateKey(createdAt);
    const bucket = byDay.get(key) ?? { posts: 0, replies: 0, participants: new Set<string>() };
    if (isPost) bucket.posts += 1;
    else bucket.replies += 1;
    bucket.participants.add(authorId);
    byDay.set(key, bucket);
  };
  for (const t of threads) bump(t.createdAt, t.authorId, true);
  for (const a of answers) bump(a.createdAt, a.authorId, false);
  for (const r of replies) bump(r.createdAt, r.authorId, false);

  const points: CommunityTrendPoint[] = [];
  const cursor = new Date(range.from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = dateKey(cursor);
    const bucket = byDay.get(key);
    points.push({ date: key, posts: bucket?.posts ?? 0, replies: bucket?.replies ?? 0, participants: bucket?.participants.size ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

export type TopContributorRow = {
  userId: string;
  name: string;
  email: string;
  posts: number;
  replies: number;
  helpfulAnswers: number;
  communityXp: number;
};

export async function getTopContributors(range: ResolvedRange, limit = 10): Promise<TopContributorRow[]> {
  const [threads, answers, replies, xpRows] = await Promise.all([
    prisma.discussionThread.groupBy({ by: ["authorId"], where: { createdAt: { gte: range.from, lte: range.to } }, _count: { _all: true } }),
    prisma.discussionAnswer.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true, isAccepted: true } }),
    prisma.discussionReply.groupBy({ by: ["authorId"], where: { createdAt: { gte: range.from, lte: range.to } }, _count: { _all: true } }),
    prisma.userXpTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: range.from, lte: range.to }, isReversed: false, amount: { gt: 0 }, ruleCode: { startsWith: "DISCUSSION" } },
      _sum: { amount: true },
    }),
  ]);

  const postsByUser = new Map(threads.map((t) => [t.authorId, t._count._all]));
  const repliesByUser = new Map(replies.map((r) => [r.authorId, r._count._all]));
  const answersByUser = new Map<string, { total: number; accepted: number }>();
  for (const a of answers) {
    const entry = answersByUser.get(a.authorId) ?? { total: 0, accepted: 0 };
    entry.total += 1;
    if (a.isAccepted) entry.accepted += 1;
    answersByUser.set(a.authorId, entry);
  }
  const xpByUser = new Map(xpRows.map((r) => [r.userId, r._sum.amount ?? 0]));

  const userIds = new Set([...postsByUser.keys(), ...repliesByUser.keys(), ...answersByUser.keys(), ...xpByUser.keys()]);
  const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true, email: true } });

  const rows: TopContributorRow[] = users.map((u) => {
    const answerEntry = answersByUser.get(u.id) ?? { total: 0, accepted: 0 };
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      posts: postsByUser.get(u.id) ?? 0,
      replies: (repliesByUser.get(u.id) ?? 0) + answerEntry.total,
      helpfulAnswers: answerEntry.accepted,
      communityXp: xpByUser.get(u.id) ?? 0,
    };
  });

  return rows.sort((a, b) => b.communityXp - a.communityXp).slice(0, limit);
}

export type LearningCommunityOverlap = { courseOnly: number; communityOnly: number; both: number; neither: number };

export async function getLearningCommunityOverlap(range: ResolvedRange): Promise<LearningCommunityOverlap> {
  const [learningMap, communityAuthors, totalStudents] = await Promise.all([
    getMeaningfulActivityDateKeys(range.from, range.to),
    prisma.discussionThread.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
    countTenantStudents(),
  ]);

  // learningMap already includes community-driven days (see shared.ts), so
  // "course activity" here is isolated to the learning-only signal by
  // excluding pure community participants from the learning set.
  const communitySet = new Set(communityAuthors.map((t) => t.authorId));
  const learningSet = new Set(learningMap.keys());

  let courseOnly = 0;
  let communityOnly = 0;
  let both = 0;
  for (const id of new Set([...learningSet, ...communitySet])) {
    const inLearning = learningSet.has(id);
    const inCommunity = communitySet.has(id);
    if (inLearning && inCommunity) both += 1;
    else if (inLearning) courseOnly += 1;
    else communityOnly += 1;
  }

  const neither = Math.max(0, totalStudents - courseOnly - communityOnly - both);
  return { courseOnly, communityOnly, both, neither };
}

export async function getCommunityLearningCorrelation(range: ResolvedRange): Promise<ComparisonResult> {
  const [communityAuthors, allStudents] = await Promise.all([
    prisma.discussionThread.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { authorId: true } }),
    getTenantStudentMemberships(),
  ]);
  const withGroup = [...new Set(communityAuthors.map((t) => t.authorId))];
  const withGroupSet = new Set(withGroup);
  const withoutGroup = allStudents.map((m) => m.userId).filter((id) => !withGroupSet.has(id));

  if (withGroup.length < MIN_COMPARISON_SAMPLE_SIZE || withoutGroup.length < MIN_COMPARISON_SAMPLE_SIZE) {
    return { suppressed: true, withGroupSize: withGroup.length, withoutGroupSize: withoutGroup.length, minSampleSize: MIN_COMPARISON_SAMPLE_SIZE };
  }

  const [withStats, withoutStats] = await Promise.all([groupLearningStats(withGroup, range), groupLearningStats(withoutGroup, range)]);

  return {
    suppressed: false,
    withGroupSize: withGroup.length,
    withoutGroupSize: withoutGroup.length,
    metrics: [
      { label: "Completion rate", withGroupValue: withStats.completionRate, withoutGroupValue: withoutStats.completionRate, unit: "percent" },
      { label: "Avg. learning time", withGroupValue: withStats.avgLearningMinutes, withoutGroupValue: withoutStats.avgLearningMinutes, unit: "minutes" },
      { label: "Returning learner rate", withGroupValue: withStats.returningRate, withoutGroupValue: withoutStats.returningRate, unit: "percent" },
    ],
  };
}

async function groupLearningStats(userIds: string[], range: ResolvedRange) {
  const [enrollments, completions, learningAgg, activityMap] = await Promise.all([
    prisma.enrollment.count({ where: { userId: { in: userIds }, status: "ACTIVE" } }),
    prisma.userActivityEvent.findMany({
      where: { userId: { in: userIds }, type: "COURSE_COMPLETED" },
      distinct: ["userId", "courseId"],
      select: { userId: true },
    }),
    prisma.userDailyLearningActivity.aggregate({
      where: { userId: { in: userIds }, activityDate: { gte: range.from.toISOString().slice(0, 10), lte: range.to.toISOString().slice(0, 10) } },
      _sum: { learningTimeSeconds: true },
    }),
    getMeaningfulActivityDateKeys(range.from, range.to),
  ]);

  const activeInRange = userIds.filter((id) => activityMap.has(id));
  const returningCount = await getReturningLearnerCount(activeInRange, range.from);

  return {
    completionRate: enrollments === 0 ? 0 : Math.round((completions.length / enrollments) * 1000) / 10,
    avgLearningMinutes: userIds.length === 0 ? 0 : Math.round((learningAgg._sum.learningTimeSeconds ?? 0) / 60 / userIds.length),
    returningRate: activeInRange.length === 0 ? 0 : Math.round((returningCount / activeInRange.length) * 1000) / 10,
  };
}

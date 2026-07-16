import "server-only";
import { prisma } from "@/lib/prisma";

// Minimal DB-backed rate limit — no Redis, no new dependency, matches "don't
// overengineer v1." Rejects rapid-fire creation regardless of XP daily caps
// (XP caps are an economy control, not a spam control — see plan section 11).
const WINDOW_MS = 60_000;
const MAX_CREATES_PER_WINDOW = 5;

export async function checkCommunityRateLimit(userId: string): Promise<{ allowed: boolean }> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [threads, answers, replies] = await Promise.all([
    prisma.discussionThread.count({ where: { authorId: userId, createdAt: { gte: since } } }),
    prisma.discussionAnswer.count({ where: { authorId: userId, createdAt: { gte: since } } }),
    prisma.discussionReply.count({ where: { authorId: userId, createdAt: { gte: since } } }),
  ]);
  const total = threads + answers + replies;
  return { allowed: total < MAX_CREATES_PER_WINDOW };
}

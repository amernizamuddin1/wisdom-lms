import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { recordDiscussionReactionReceived } from "@/lib/gamification/events";
import { getTenantId } from "@/lib/tenant-context";

export type ReactionEntityType = "THREAD" | "ANSWER" | "REPLY";

async function getEntityAuthorId(entityType: ReactionEntityType, entityId: string): Promise<string | null> {
  if (entityType === "THREAD") {
    const row = await prisma.discussionThread.findUnique({ where: { id: entityId }, select: { authorId: true } });
    return row?.authorId ?? null;
  }
  if (entityType === "ANSWER") {
    const row = await prisma.discussionAnswer.findUnique({ where: { id: entityId }, select: { authorId: true } });
    return row?.authorId ?? null;
  }
  const row = await prisma.discussionReply.findUnique({ where: { id: entityId }, select: { authorId: true } });
  return row?.authorId ?? null;
}

// Toggle like. Deletes/recreates the DiscussionReaction row on unlike/like,
// but XP is only ever awarded via awardXp's dedupeKey
// (DISCUSSION_HELPFUL_REACTION_RECEIVED:{entityType}:{entityId}:{likerUserId}),
// so re-liking after unliking hits the same dedupe key and is silently
// ignored — no farming.
export async function toggleReaction(
  userId: string,
  entityType: ReactionEntityType,
  entityId: string,
): Promise<{ liked: boolean }> {
  const existing = await prisma.discussionReaction.findUnique({
    where: {
      userId_entityType_entityId_reactionType: { userId, entityType, entityId, reactionType: "LIKE" },
    },
  });

  if (existing) {
    await prisma.discussionReaction.delete({ where: { id: existing.id } });
    return { liked: false };
  }

  const tenantId = await getTenantId();
  try {
    await prisma.discussionReaction.create({
      data: { userId, entityType, entityId, reactionType: "LIKE", tenantId },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { liked: true };
    }
    throw e;
  }

  const authorId = await getEntityAuthorId(entityType, entityId);
  if (authorId && authorId !== userId) {
    await prisma.$transaction(async (tx) => {
      await recordDiscussionReactionReceived(tx, {
        recipientUserId: authorId,
        likerUserId: userId,
        entityType,
        entityId,
      });
    });
  }

  return { liked: true };
}

export async function getReactionCounts(
  entityType: ReactionEntityType,
  entityIds: string[],
): Promise<Record<string, number>> {
  if (entityIds.length === 0) return {};
  const rows = await prisma.discussionReaction.groupBy({
    by: ["entityId"],
    where: { entityType, entityId: { in: entityIds }, reactionType: "LIKE" },
    _count: { entityId: true },
  });
  const map: Record<string, number> = {};
  for (const row of rows) map[row.entityId] = row._count.entityId;
  return map;
}

export async function getUserLikedEntityIds(
  userId: string,
  entityType: ReactionEntityType,
  entityIds: string[],
): Promise<Set<string>> {
  if (entityIds.length === 0) return new Set();
  const rows = await prisma.discussionReaction.findMany({
    where: { userId, entityType, entityId: { in: entityIds }, reactionType: "LIKE" },
    select: { entityId: true },
  });
  return new Set(rows.map((r) => r.entityId));
}

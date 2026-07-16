import "server-only";
import { prisma } from "@/lib/prisma";
import { recordDiscussionReplyCreated } from "@/lib/gamification/events";
import { createDiscussionNotification } from "./notifications";
import { touchLastActivity } from "./threads";
import { autoFollow } from "./follows";
import { getCommunitySettings } from "./access";
import { getTenantId } from "@/lib/tenant-context";

const MIN_QUALIFYING_LENGTH = 40;

function plainTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, "").trim().length;
}

// One level only — replies attach to a thread directly, or to an answer
// (no parentReplyId / nested replies, per spec section 5).
export async function createReply(params: {
  threadId: string;
  answerId?: string | null;
  authorId: string;
  bodyHtml: string;
}) {
  const thread = await prisma.discussionThread.findUniqueOrThrow({
    where: { id: params.threadId },
    select: { id: true, authorId: true, isLocked: true, status: true },
  });
  if (thread.status !== "ACTIVE") throw new Error("This thread is not available.");
  if (thread.isLocked) throw new Error("This thread is locked.");

  let notifyUserId: string | null = null;
  if (params.answerId) {
    const answer = await prisma.discussionAnswer.findUniqueOrThrow({
      where: { id: params.answerId },
      select: { authorId: true },
    });
    notifyUserId = answer.authorId;
  } else {
    notifyUserId = thread.authorId;
  }

  const settings = await getCommunitySettings();
  const tenantId = await getTenantId();

  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.discussionReply.create({
      data: {
        threadId: params.threadId,
        answerId: params.answerId ?? null,
        authorId: params.authorId,
        bodyHtml: params.bodyHtml,
        tenantId,
      },
    });

    if (plainTextLength(params.bodyHtml) >= MIN_QUALIFYING_LENGTH) {
      await recordDiscussionReplyCreated(tx, { userId: params.authorId, entityId: created.id });
    }

    if (notifyUserId && notifyUserId !== params.authorId) {
      await createDiscussionNotification(tx, {
        userId: notifyUserId,
        type: params.answerId ? "REPLIED_TO_ANSWER" : "REPLIED_TO_THREAD",
        actorId: params.authorId,
        threadId: params.threadId,
        answerId: params.answerId ?? undefined,
        replyId: created.id,
      });
    }

    return created;
  });

  await touchLastActivity(params.threadId);
  if (settings.autoFollowOnParticipation) await autoFollow(params.authorId, params.threadId);

  return reply;
}

export async function listReplies(threadId: string, includeHiddenDeleted = false) {
  return prisma.discussionReply.findMany({
    where: {
      threadId,
      ...(includeHiddenDeleted ? {} : { deletedAt: null, hiddenAt: null }),
    },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, profilePhotoUrl: true } } },
  });
}

export async function editReply(replyId: string, bodyHtml: string): Promise<void> {
  await prisma.discussionReply.update({ where: { id: replyId }, data: { bodyHtml, editedAt: new Date() } });
}

export async function hideReply(replyId: string, adminId: string): Promise<void> {
  await prisma.discussionReply.update({
    where: { id: replyId },
    data: { hiddenAt: new Date(), hiddenById: adminId },
  });
}

export async function restoreReply(replyId: string): Promise<void> {
  await prisma.discussionReply.update({
    where: { id: replyId },
    data: { hiddenAt: null, hiddenById: null, deletedAt: null, deletedById: null, deletionReason: null },
  });
}

export async function deleteReply(replyId: string, deletedById: string, reason?: string): Promise<void> {
  await prisma.discussionReply.update({
    where: { id: replyId },
    data: { deletedAt: new Date(), deletedById, deletionReason: reason },
  });
}

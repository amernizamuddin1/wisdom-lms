import "server-only";
import { prisma } from "@/lib/prisma";
import { recordDiscussionReplyCreated, recordDiscussionAnswerAccepted } from "@/lib/gamification/events";
import { getTenantId } from "@/lib/tenant-context";
import { createDiscussionNotification } from "./notifications";
import { touchLastActivity } from "./threads";
import { autoFollow } from "./follows";
import { getCommunitySettings } from "./access";

const MIN_QUALIFYING_LENGTH = 40;

function plainTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, "").trim().length;
}

export async function createAnswer(params: { threadId: string; authorId: string; bodyHtml: string }) {
  const thread = await prisma.discussionThread.findUniqueOrThrow({
    where: { id: params.threadId },
    select: { id: true, authorId: true, isLocked: true, status: true },
  });
  if (thread.status !== "ACTIVE") throw new Error("This thread is not available.");
  if (thread.isLocked) throw new Error("This thread is locked.");

  const settings = await getCommunitySettings();
  const tenantId = await getTenantId();

  const answer = await prisma.$transaction(async (tx) => {
    const created = await tx.discussionAnswer.create({
      data: { threadId: params.threadId, authorId: params.authorId, bodyHtml: params.bodyHtml, tenantId },
    });

    if (plainTextLength(params.bodyHtml) >= MIN_QUALIFYING_LENGTH) {
      await recordDiscussionReplyCreated(tx, { userId: params.authorId, entityId: created.id });
    }

    if (thread.authorId !== params.authorId) {
      await createDiscussionNotification(tx, {
        userId: thread.authorId,
        type: "ANSWERED_QUESTION",
        actorId: params.authorId,
        threadId: params.threadId,
        answerId: created.id,
      });
    }

    return created;
  });

  await touchLastActivity(params.threadId);
  if (settings.autoFollowOnParticipation) await autoFollow(params.authorId, params.threadId);

  return answer;
}

export async function listAnswers(threadId: string, includeHiddenDeleted = false) {
  return prisma.discussionAnswer.findMany({
    where: {
      threadId,
      ...(includeHiddenDeleted ? {} : { deletedAt: null, hiddenAt: null }),
    },
    orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }],
    include: { author: { select: { id: true, name: true, profilePhotoUrl: true } } },
  });
}

export async function editAnswer(answerId: string, bodyHtml: string): Promise<void> {
  await prisma.discussionAnswer.update({
    where: { id: answerId },
    data: { bodyHtml, editedAt: new Date() },
  });
}

export async function hideAnswer(answerId: string, adminId: string): Promise<void> {
  await prisma.discussionAnswer.update({
    where: { id: answerId },
    data: { hiddenAt: new Date(), hiddenById: adminId },
  });
}

export async function restoreAnswer(answerId: string): Promise<void> {
  await prisma.discussionAnswer.update({
    where: { id: answerId },
    data: { hiddenAt: null, hiddenById: null, deletedAt: null, deletedById: null, deletionReason: null },
  });
}

export async function deleteAnswer(answerId: string, deletedById: string, reason?: string): Promise<void> {
  await prisma.discussionAnswer.update({
    where: { id: answerId },
    data: { deletedAt: new Date(), deletedById, deletionReason: reason },
  });
}

// Question author accepts an answer. Idempotent by construction via the XP
// dedupeKey (DISCUSSION_ANSWER_ACCEPTED:{answerId}) — accept -> unaccept ->
// accept-a-different-answer never double-pays because each answer has its
// own dedupe key.
export async function acceptAnswer(params: { threadId: string; answerId: string; requestedById: string }) {
  const [thread, answer] = await Promise.all([
    prisma.discussionThread.findUniqueOrThrow({ where: { id: params.threadId } }),
    prisma.discussionAnswer.findUniqueOrThrow({ where: { id: params.answerId } }),
  ]);
  if (answer.threadId !== params.threadId) throw new Error("Answer does not belong to this thread.");

  await prisma.$transaction(async (tx) => {
    if (thread.acceptedAnswerId && thread.acceptedAnswerId !== params.answerId) {
      await tx.discussionAnswer.update({
        where: { id: thread.acceptedAnswerId },
        data: { isAccepted: false },
      });
    }
    await tx.discussionAnswer.update({ where: { id: params.answerId }, data: { isAccepted: true } });
    await tx.discussionThread.update({
      where: { id: params.threadId },
      data: { acceptedAnswerId: params.answerId, isResolved: true },
    });

    await recordDiscussionAnswerAccepted(tx, { userId: answer.authorId, answerId: params.answerId });

    if (answer.authorId !== params.requestedById) {
      await createDiscussionNotification(tx, {
        userId: answer.authorId,
        type: "ANSWER_ACCEPTED",
        actorId: params.requestedById,
        threadId: params.threadId,
        answerId: params.answerId,
      });
    }
  });
}

export async function unacceptAnswer(threadId: string, answerId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.discussionAnswer.update({ where: { id: answerId }, data: { isAccepted: false } });
    await tx.discussionThread.update({
      where: { id: threadId },
      data: { acceptedAnswerId: null, isResolved: false },
    });
  });
}

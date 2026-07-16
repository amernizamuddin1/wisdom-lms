"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logModerationAction } from "@/lib/community/moderation";
import { recordDiscussionAnswerAccepted } from "@/lib/gamification/events";

export type ActionResult = { error?: string; success?: boolean };

function revalidateThread(threadId: string) {
  revalidatePath(`/admin/community/discussions/${threadId}`);
  revalidatePath("/admin/community/discussions");
  revalidatePath("/admin/community");
}

// ---- Thread moderation ----

export async function hideThreadAction(threadId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const thread = await prisma.discussionThread.findUniqueOrThrow({ where: { id: threadId } });

  await prisma.$transaction(async (tx) => {
    await tx.discussionThread.update({
      where: { id: threadId },
      data: { status: "HIDDEN", hiddenAt: new Date(), hiddenById: admin.id },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "HIDE",
      entityType: "THREAD",
      entityId: threadId,
      threadId,
      previousState: thread.status,
      newState: "HIDDEN",
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function restoreThreadAction(threadId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const thread = await prisma.discussionThread.findUniqueOrThrow({ where: { id: threadId } });
  const wasDeleted = thread.status === "DELETED";

  await prisma.$transaction(async (tx) => {
    await tx.discussionThread.update({
      where: { id: threadId },
      data: {
        status: "ACTIVE",
        hiddenAt: null,
        hiddenById: null,
        deletedAt: null,
        deletedById: null,
        deletionReason: null,
      },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: wasDeleted ? "RESTORE_DELETED" : "RESTORE",
      entityType: "THREAD",
      entityId: threadId,
      threadId,
      previousState: thread.status,
      newState: "ACTIVE",
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function deleteThreadAction(threadId: string, reason?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const thread = await prisma.discussionThread.findUniqueOrThrow({ where: { id: threadId } });

  await prisma.$transaction(async (tx) => {
    await tx.discussionThread.update({
      where: { id: threadId },
      data: { status: "DELETED", deletedAt: new Date(), deletedById: admin.id, deletionReason: reason || null },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "DELETE",
      entityType: "THREAD",
      entityId: threadId,
      threadId,
      previousState: thread.status,
      newState: "DELETED",
      reason,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function setThreadPinnedAction(threadId: string, isPinned: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.discussionThread.update({ where: { id: threadId }, data: { isPinned } });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: isPinned ? "PIN" : "UNPIN",
      entityType: "THREAD",
      entityId: threadId,
      threadId,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function setThreadLockedAction(threadId: string, isLocked: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.discussionThread.update({ where: { id: threadId }, data: { isLocked } });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: isLocked ? "LOCK" : "UNLOCK",
      entityType: "THREAD",
      entityId: threadId,
      threadId,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function setThreadResolvedAction(threadId: string, isResolved: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.discussionThread.update({ where: { id: threadId }, data: { isResolved } });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: isResolved ? "MARK_RESOLVED" : "UNMARK_RESOLVED",
      entityType: "THREAD",
      entityId: threadId,
      threadId,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function changeAcceptedAnswerAction(threadId: string, answerId: string | null): Promise<ActionResult> {
  const admin = await requireAdmin();
  const thread = await prisma.discussionThread.findUniqueOrThrow({ where: { id: threadId } });

  let answer: Awaited<ReturnType<typeof prisma.discussionAnswer.findUnique>> = null;
  if (answerId) {
    answer = await prisma.discussionAnswer.findUnique({ where: { id: answerId } });
    if (!answer || answer.threadId !== threadId) return { error: "Answer does not belong to this thread." };
  }

  await prisma.$transaction(async (tx) => {
    if (thread.acceptedAnswerId && thread.acceptedAnswerId !== answerId) {
      await tx.discussionAnswer.update({ where: { id: thread.acceptedAnswerId }, data: { isAccepted: false } });
    }
    if (answerId && answer) {
      await tx.discussionAnswer.update({ where: { id: answerId }, data: { isAccepted: true } });
      // Only when newly (re-)accepted, never on unaccept/clear — the dedupe key
      // (DISCUSSION_ANSWER_ACCEPTED:{answerId}) makes this safe to call even if
      // this same answer was already accepted-then-unaccepted before via either
      // this admin flow or the student-facing lib/community/answers.ts::acceptAnswer.
      await recordDiscussionAnswerAccepted(tx, { userId: answer.authorId, answerId });
    }
    await tx.discussionThread.update({
      where: { id: threadId },
      data: { acceptedAnswerId: answerId, isResolved: answerId != null },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: thread.acceptedAnswerId ? "CHANGE_ACCEPTED_ANSWER" : "ACCEPT_ANSWER",
      entityType: "THREAD",
      entityId: threadId,
      threadId,
      previousState: thread.acceptedAnswerId ?? undefined,
      newState: answerId ?? undefined,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

// ---- Answer moderation ----

export async function hideAnswerAction(threadId: string, answerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.discussionAnswer.update({ where: { id: answerId }, data: { hiddenAt: new Date(), hiddenById: admin.id } });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "HIDE",
      entityType: "ANSWER",
      entityId: answerId,
      threadId,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function restoreAnswerAction(threadId: string, answerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const answer = await prisma.discussionAnswer.findUniqueOrThrow({ where: { id: answerId } });

  await prisma.$transaction(async (tx) => {
    await tx.discussionAnswer.update({
      where: { id: answerId },
      data: { hiddenAt: null, hiddenById: null, deletedAt: null, deletedById: null, deletionReason: null },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: answer.deletedAt ? "RESTORE_DELETED" : "RESTORE",
      entityType: "ANSWER",
      entityId: answerId,
      threadId,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function deleteAnswerAction(threadId: string, answerId: string, reason?: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.discussionAnswer.update({
      where: { id: answerId },
      data: { deletedAt: new Date(), deletedById: admin.id, deletionReason: reason || null },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "DELETE",
      entityType: "ANSWER",
      entityId: answerId,
      threadId,
      reason,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

// ---- Reply moderation ----

export async function hideReplyAction(threadId: string, replyId: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.discussionReply.update({ where: { id: replyId }, data: { hiddenAt: new Date(), hiddenById: admin.id } });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "HIDE",
      entityType: "REPLY",
      entityId: replyId,
      threadId,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function restoreReplyAction(threadId: string, replyId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const reply = await prisma.discussionReply.findUniqueOrThrow({ where: { id: replyId } });

  await prisma.$transaction(async (tx) => {
    await tx.discussionReply.update({
      where: { id: replyId },
      data: { hiddenAt: null, hiddenById: null, deletedAt: null, deletedById: null, deletionReason: null },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: reply.deletedAt ? "RESTORE_DELETED" : "RESTORE",
      entityType: "REPLY",
      entityId: replyId,
      threadId,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

export async function deleteReplyAction(threadId: string, replyId: string, reason?: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.discussionReply.update({
      where: { id: replyId },
      data: { deletedAt: new Date(), deletedById: admin.id, deletionReason: reason || null },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "DELETE",
      entityType: "REPLY",
      entityId: replyId,
      threadId,
      reason,
    });
  });

  revalidateThread(threadId);
  return { success: true };
}

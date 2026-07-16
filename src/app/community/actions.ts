"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isUserRestricted } from "@/lib/community/access";
import { checkCommunityRateLimit } from "@/lib/community/rate-limit";
import { sanitizeCommunicationHtml } from "@/lib/sanitize";
import {
  createThread,
  editThread,
  hideThread as hideThreadLib,
  deleteThread as deleteThreadLib,
  type ThreadType,
} from "@/lib/community/threads";
import { createAnswer, editAnswer, deleteAnswer as deleteAnswerLib, acceptAnswer, unacceptAnswer } from "@/lib/community/answers";
import { createReply, editReply, deleteReply as deleteReplyLib } from "@/lib/community/replies";
import { toggleReaction, type ReactionEntityType } from "@/lib/community/reactions";
import { toggleFollow } from "@/lib/community/follows";
import { createReport, type ReportReason } from "@/lib/community/reports";
import { prisma } from "@/lib/prisma";

export type ActionResult = { error?: string; success?: boolean };

async function assertNotRestricted(userId: string) {
  if (await isUserRestricted(userId)) {
    throw new Error("Your community posting privileges have been restricted.");
  }
}

async function assertRateLimitOk(userId: string) {
  const { allowed } = await checkCommunityRateLimit(userId);
  if (!allowed) {
    throw new Error("You're posting too quickly. Please wait a moment and try again.");
  }
}

function sanitize(html: string): string {
  return sanitizeCommunicationHtml(html);
}

export async function createThreadAction(input: {
  title: string;
  bodyHtml: string;
  threadType: ThreadType;
  categoryId?: string | null;
}): Promise<ActionResult & { threadId?: string }> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    await assertRateLimitOk(user.id);

    const title = input.title.trim();
    if (!title) return { error: "Title is required." };
    const bodyHtml = sanitize(input.bodyHtml);
    if (!bodyHtml.trim()) return { error: "Body is required." };

    if (input.threadType === "ANNOUNCEMENT" && user.role !== "ADMIN") {
      return { error: "Only admins can post announcements." };
    }

    if (input.categoryId) {
      const category = await prisma.communityCategory.findUnique({ where: { id: input.categoryId } });
      if (!category || !category.isActive) return { error: "Selected category is not available." };
      if (category.postingPermission === "RESTRICTED" && user.role !== "ADMIN") {
        return { error: "This category is restricted to admins." };
      }
    }

    const thread = await createThread({
      authorId: user.id,
      title,
      bodyHtml,
      threadType: input.threadType,
      categoryId: input.categoryId ?? null,
    });

    revalidatePath("/community");
    return { success: true, threadId: thread.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function editThreadAction(threadId: string, data: { title?: string; bodyHtml?: string }): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't edit this thread." };

    await editThread(threadId, user.id, {
      title: data.title?.trim(),
      bodyHtml: data.bodyHtml ? sanitize(data.bodyHtml) : undefined,
    });
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteOwnThreadAction(threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't delete this thread." };
    if (user.role === "ADMIN" && thread.authorId !== user.id) {
      await hideThreadLib(threadId, user.id);
    } else {
      await deleteThreadLib(threadId, user.id);
    }
    revalidatePath("/community");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createAnswerAction(threadId: string, bodyHtml: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    await assertRateLimitOk(user.id);
    const html = sanitize(bodyHtml);
    if (!html.trim()) return { error: "Answer body is required." };
    await createAnswer({ threadId, authorId: user.id, bodyHtml: html });
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function editAnswerAction(answerId: string, threadId: string, bodyHtml: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    const answer = await prisma.discussionAnswer.findUnique({ where: { id: answerId } });
    if (!answer) return { error: "Answer not found." };
    if (answer.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't edit this answer." };
    await editAnswer(answerId, sanitize(bodyHtml));
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteOwnAnswerAction(answerId: string, threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const answer = await prisma.discussionAnswer.findUnique({ where: { id: answerId } });
    if (!answer) return { error: "Answer not found." };
    if (answer.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't delete this answer." };
    if (user.role === "ADMIN" && answer.authorId !== user.id) {
      await prisma.discussionAnswer.update({ where: { id: answerId }, data: { hiddenAt: new Date(), hiddenById: user.id } });
    } else {
      await deleteAnswerLib(answerId, user.id);
    }
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createReplyAction(input: { threadId: string; answerId?: string | null; bodyHtml: string }): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    await assertRateLimitOk(user.id);
    const html = sanitize(input.bodyHtml);
    if (!html.trim()) return { error: "Reply body is required." };
    await createReply({ threadId: input.threadId, answerId: input.answerId ?? null, authorId: user.id, bodyHtml: html });
    revalidatePath(`/community/${input.threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function editReplyAction(replyId: string, threadId: string, bodyHtml: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    const reply = await prisma.discussionReply.findUnique({ where: { id: replyId } });
    if (!reply) return { error: "Reply not found." };
    if (reply.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't edit this reply." };
    await editReply(replyId, sanitize(bodyHtml));
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteOwnReplyAction(replyId: string, threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const reply = await prisma.discussionReply.findUnique({ where: { id: replyId } });
    if (!reply) return { error: "Reply not found." };
    if (reply.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't delete this reply." };
    if (user.role === "ADMIN" && reply.authorId !== user.id) {
      await prisma.discussionReply.update({ where: { id: replyId }, data: { hiddenAt: new Date(), hiddenById: user.id } });
    } else {
      await deleteReplyLib(replyId, user.id);
    }
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function acceptAnswerAction(threadId: string, answerId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "Only the thread author can accept an answer." };
    await acceptAnswer({ threadId, answerId, requestedById: user.id });
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function unacceptAnswerAction(threadId: string, answerId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "Only the thread author can unaccept an answer." };
    await unacceptAnswer(threadId, answerId);
    revalidatePath(`/community/${threadId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function toggleReactionAction(
  entityType: ReactionEntityType,
  entityId: string,
  threadId: string,
): Promise<ActionResult & { liked?: boolean }> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    const result = await toggleReaction(user.id, entityType, entityId);
    revalidatePath(`/community/${threadId}`);
    return { success: true, liked: result.liked };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function toggleFollowAction(threadId: string): Promise<ActionResult & { following?: boolean }> {
  const user = await requireUser();
  try {
    const result = await toggleFollow(user.id, threadId);
    revalidatePath(`/community/${threadId}`);
    return { success: true, following: result.following };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createReportAction(input: {
  entityType: "THREAD" | "ANSWER" | "REPLY";
  entityId: string;
  reason: ReportReason;
  details?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertNotRestricted(user.id);
    const result = await createReport({
      reporterId: user.id,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      details: input.details,
    });
    if (!result.created) return { error: "You've already reported this." };
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

"use server";

// Course-scoped mirror of src/app/community/actions.ts. Every mutation here
// re-checks canAccessCourseDiscussion(user.id, courseId, user.role) before
// touching data — revoking a learner's enrollment mid-course must cut off
// posting/reading immediately even though their historical posts and XP
// stay intact (nothing here ever deletes/hides posts on access loss).
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canAccessCourseDiscussion, isUserRestricted } from "@/lib/community/access";
import { checkCommunityRateLimit } from "@/lib/community/rate-limit";
import { sanitizeCommunicationHtml } from "@/lib/sanitize";
import {
  createThread,
  editThread,
  deleteThread as deleteThreadLib,
  hideThread as hideThreadLib,
  type ThreadType,
} from "@/lib/community/threads";
import {
  createAnswer,
  editAnswer,
  deleteAnswer as deleteAnswerLib,
  acceptAnswer,
  unacceptAnswer,
} from "@/lib/community/answers";
import { createReply, editReply, deleteReply as deleteReplyLib } from "@/lib/community/replies";
import { toggleReaction, type ReactionEntityType } from "@/lib/community/reactions";
import { toggleFollow } from "@/lib/community/follows";
import { createReport, type ReportReason } from "@/lib/community/reports";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

export type ActionResult = { error?: string; success?: boolean };

async function assertCourseAccess(userId: string, courseId: string, role: Role) {
  if (!(await canAccessCourseDiscussion(userId, courseId, role))) {
    throw new Error("You no longer have access to this course's discussion board.");
  }
}

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

function discussionPath(courseId: string, threadId?: string): string {
  return threadId
    ? `/dashboard/courses/${courseId}/discussion/${threadId}`
    : `/dashboard/courses/${courseId}/discussion`;
}

export async function createThreadAction(input: {
  courseId: string;
  title: string;
  bodyHtml: string;
  threadType: Extract<ThreadType, "QUESTION" | "DISCUSSION">;
}): Promise<ActionResult & { threadId?: string }> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, input.courseId, user.role);
    await assertNotRestricted(user.id);
    await assertRateLimitOk(user.id);

    const title = input.title.trim();
    if (!title) return { error: "Title is required." };
    const bodyHtml = sanitize(input.bodyHtml);
    if (!bodyHtml.trim()) return { error: "Body is required." };

    const thread = await createThread({
      authorId: user.id,
      title,
      bodyHtml,
      threadType: input.threadType,
      categoryId: null,
      courseId: input.courseId,
    });

    revalidatePath(discussionPath(input.courseId));
    return { success: true, threadId: thread.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function editThreadAction(
  courseId: string,
  threadId: string,
  data: { title?: string; bodyHtml?: string },
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    await assertNotRestricted(user.id);
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.courseId !== courseId) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't edit this thread." };

    await editThread(threadId, user.id, {
      title: data.title?.trim(),
      bodyHtml: data.bodyHtml ? sanitize(data.bodyHtml) : undefined,
    });
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteOwnThreadAction(courseId: string, threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.courseId !== courseId) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't delete this thread." };
    if (user.role === "ADMIN" && thread.authorId !== user.id) {
      await hideThreadLib(threadId, user.id);
    } else {
      await deleteThreadLib(threadId, user.id);
    }
    revalidatePath(discussionPath(courseId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createAnswerAction(courseId: string, threadId: string, bodyHtml: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    await assertNotRestricted(user.id);
    await assertRateLimitOk(user.id);
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.courseId !== courseId) return { error: "Thread not found." };
    const html = sanitize(bodyHtml);
    if (!html.trim()) return { error: "Answer body is required." };
    await createAnswer({ threadId, authorId: user.id, bodyHtml: html });
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function editAnswerAction(courseId: string, answerId: string, threadId: string, bodyHtml: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    await assertNotRestricted(user.id);
    const answer = await prisma.discussionAnswer.findUnique({ where: { id: answerId } });
    if (!answer) return { error: "Answer not found." };
    if (answer.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't edit this answer." };
    await editAnswer(answerId, sanitize(bodyHtml));
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteOwnAnswerAction(courseId: string, answerId: string, threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    const answer = await prisma.discussionAnswer.findUnique({ where: { id: answerId } });
    if (!answer) return { error: "Answer not found." };
    if (answer.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't delete this answer." };
    if (user.role === "ADMIN" && answer.authorId !== user.id) {
      await prisma.discussionAnswer.update({ where: { id: answerId }, data: { hiddenAt: new Date(), hiddenById: user.id } });
    } else {
      await deleteAnswerLib(answerId, user.id);
    }
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createReplyAction(input: {
  courseId: string;
  threadId: string;
  answerId?: string | null;
  bodyHtml: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, input.courseId, user.role);
    await assertNotRestricted(user.id);
    await assertRateLimitOk(user.id);
    const thread = await prisma.discussionThread.findUnique({ where: { id: input.threadId } });
    if (!thread || thread.courseId !== input.courseId) return { error: "Thread not found." };
    const html = sanitize(input.bodyHtml);
    if (!html.trim()) return { error: "Reply body is required." };
    await createReply({ threadId: input.threadId, answerId: input.answerId ?? null, authorId: user.id, bodyHtml: html });
    revalidatePath(discussionPath(input.courseId, input.threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function editReplyAction(courseId: string, replyId: string, threadId: string, bodyHtml: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    await assertNotRestricted(user.id);
    const reply = await prisma.discussionReply.findUnique({ where: { id: replyId } });
    if (!reply) return { error: "Reply not found." };
    if (reply.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't edit this reply." };
    await editReply(replyId, sanitize(bodyHtml));
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteOwnReplyAction(courseId: string, replyId: string, threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    const reply = await prisma.discussionReply.findUnique({ where: { id: replyId } });
    if (!reply) return { error: "Reply not found." };
    if (reply.authorId !== user.id && user.role !== "ADMIN") return { error: "You can't delete this reply." };
    if (user.role === "ADMIN" && reply.authorId !== user.id) {
      await prisma.discussionReply.update({ where: { id: replyId }, data: { hiddenAt: new Date(), hiddenById: user.id } });
    } else {
      await deleteReplyLib(replyId, user.id);
    }
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function acceptAnswerAction(courseId: string, threadId: string, answerId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.courseId !== courseId) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "Only the thread author can accept an answer." };
    await acceptAnswer({ threadId, answerId, requestedById: user.id });
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function unacceptAnswerAction(courseId: string, threadId: string, answerId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.courseId !== courseId) return { error: "Thread not found." };
    if (thread.authorId !== user.id && user.role !== "ADMIN") return { error: "Only the thread author can unaccept an answer." };
    await unacceptAnswer(threadId, answerId);
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function toggleReactionAction(
  courseId: string,
  entityType: ReactionEntityType,
  entityId: string,
  threadId: string,
): Promise<ActionResult & { liked?: boolean }> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    await assertNotRestricted(user.id);
    const result = await toggleReaction(user.id, entityType, entityId);
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true, liked: result.liked };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function toggleFollowAction(courseId: string, threadId: string): Promise<ActionResult & { following?: boolean }> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, courseId, user.role);
    const result = await toggleFollow(user.id, threadId);
    revalidatePath(discussionPath(courseId, threadId));
    return { success: true, following: result.following };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createReportAction(input: {
  courseId: string;
  entityType: "THREAD" | "ANSWER" | "REPLY";
  entityId: string;
  reason: ReportReason;
  details?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await assertCourseAccess(user.id, input.courseId, user.role);
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

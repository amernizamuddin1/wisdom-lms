import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

export type DiscussionNotificationType =
  | "ANSWERED_QUESTION"
  | "REPLIED_TO_THREAD"
  | "REPLIED_TO_ANSWER"
  | "ANSWER_ACCEPTED"
  | "THREAD_PINNED"
  | "THREAD_LOCKED"
  | "MODERATION_ACTION"
  | "FOLLOWED_THREAD_ACTIVITY";

export type CreateDiscussionNotificationParams = {
  userId: string;
  type: DiscussionNotificationType;
  actorId?: string;
  threadId?: string;
  answerId?: string;
  replyId?: string;
};

// Basic grouping: if an unread notification of the same type+thread already
// exists for the recipient, bump its groupCount and touch createdAt instead
// of inserting a new row — handles "5 new replies" without spamming the bell.
// Never notifies a user about their own action.
export async function createDiscussionNotification(
  tx: Tx,
  params: CreateDiscussionNotificationParams,
): Promise<void> {
  if (params.actorId && params.actorId === params.userId) return;

  const tenantId = await getTenantId();

  const existing = params.threadId
    ? await tx.discussionNotification.findFirst({
        where: {
          userId: params.userId,
          type: params.type,
          threadId: params.threadId,
          readAt: null,
        },
      })
    : null;

  if (existing) {
    await tx.discussionNotification.update({
      where: { id: existing.id },
      data: {
        groupCount: { increment: 1 },
        actorId: params.actorId,
        answerId: params.answerId,
        replyId: params.replyId,
        createdAt: new Date(),
      },
    });
    return;
  }

  await tx.discussionNotification.create({
    data: {
      userId: params.userId,
      type: params.type,
      actorId: params.actorId,
      threadId: params.threadId,
      answerId: params.answerId,
      replyId: params.replyId,
      tenantId,
    },
  });
}

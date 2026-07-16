import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { recordDiscussionPostCreated } from "@/lib/gamification/events";
import { autoFollow } from "./follows";
import { getCommunitySettings } from "./access";
import { getTenantId } from "@/lib/tenant-context";

export type ThreadType = "QUESTION" | "DISCUSSION" | "ANNOUNCEMENT";

const MIN_QUALIFYING_LENGTH = 40;

function plainTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, "").trim().length;
}

export async function createThread(params: {
  authorId: string;
  title: string;
  bodyHtml: string;
  threadType: ThreadType;
  categoryId?: string | null;
  courseId?: string | null;
}) {
  const settings = await getCommunitySettings();
  if (!settings.communityEnabled) throw new Error("Community is currently disabled.");
  const tenantId = await getTenantId();

  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.discussionThread.create({
      data: {
        authorId: params.authorId,
        title: params.title,
        bodyHtml: params.bodyHtml,
        threadType: params.threadType,
        categoryId: params.categoryId ?? null,
        courseId: params.courseId ?? null,
        tenantId,
      },
    });

    if (plainTextLength(params.bodyHtml) >= MIN_QUALIFYING_LENGTH) {
      await recordDiscussionPostCreated(tx, { userId: params.authorId, threadId: created.id });
    }

    return created;
  });

  if (settings.autoFollowOnParticipation) {
    await autoFollow(params.authorId, thread.id);
  }

  return thread;
}

export async function getThreadById(threadId: string, opts?: { includeHiddenDeleted?: boolean }) {
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    include: {
      author: { select: { id: true, name: true, profilePhotoUrl: true } },
      category: true,
    },
  });
  if (!thread) return null;
  if (!opts?.includeHiddenDeleted && thread.status !== "ACTIVE") return null;
  return thread;
}

export async function incrementViewCount(threadId: string): Promise<void> {
  await prisma.discussionThread.update({ where: { id: threadId }, data: { viewCount: { increment: 1 } } });
}

export type ThreadListFilter = {
  categoryId?: string;
  courseId?: string | null;
  threadType?: ThreadType;
  sort?: "LATEST" | "POPULAR" | "UNANSWERED";
  resolvedOnly?: boolean;
  authorId?: string;
  search?: string;
  includeHiddenDeleted?: boolean;
};

export async function listThreads(filter: ThreadListFilter, page = 1, pageSize = 20) {
  const where: Prisma.DiscussionThreadWhereInput = {
    status: filter.includeHiddenDeleted ? undefined : "ACTIVE",
    categoryId: filter.categoryId,
    courseId: filter.courseId === undefined ? undefined : filter.courseId,
    threadType: filter.threadType,
    authorId: filter.authorId,
    isResolved: filter.resolvedOnly ? true : undefined,
    title: filter.search ? { contains: filter.search, mode: "insensitive" } : undefined,
  };

  const orderBy: Prisma.DiscussionThreadOrderByWithRelationInput[] =
    filter.sort === "POPULAR"
      ? [{ isPinned: "desc" }, { viewCount: "desc" }]
      : [{ isPinned: "desc" }, { lastActivityAt: "desc" }];

  const unansweredWhere: Prisma.DiscussionThreadWhereInput =
    filter.sort === "UNANSWERED" ? { ...where, answers: { none: {} } } : where;

  const [items, total] = await Promise.all([
    prisma.discussionThread.findMany({
      where: unansweredWhere,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, name: true, profilePhotoUrl: true } },
        category: true,
        _count: { select: { answers: true, replies: true } },
      },
    }),
    prisma.discussionThread.count({ where: unansweredWhere }),
  ]);

  return { items, total, page, pageSize };
}

export async function editThread(
  threadId: string,
  userId: string,
  data: { title?: string; bodyHtml?: string },
): Promise<void> {
  await prisma.discussionThread.update({
    where: { id: threadId },
    data: { title: data.title, bodyHtml: data.bodyHtml },
  });
  void userId;
}

export async function hideThread(threadId: string, adminId: string): Promise<void> {
  await prisma.discussionThread.update({
    where: { id: threadId },
    data: { status: "HIDDEN", hiddenAt: new Date(), hiddenById: adminId },
  });
}

export async function restoreThread(threadId: string): Promise<void> {
  await prisma.discussionThread.update({
    where: { id: threadId },
    data: { status: "ACTIVE", hiddenAt: null, hiddenById: null, deletedAt: null, deletedById: null, deletionReason: null },
  });
}

export async function deleteThread(threadId: string, deletedById: string, reason?: string): Promise<void> {
  await prisma.discussionThread.update({
    where: { id: threadId },
    data: { status: "DELETED", deletedAt: new Date(), deletedById, deletionReason: reason },
  });
}

export async function setPinned(threadId: string, isPinned: boolean): Promise<void> {
  await prisma.discussionThread.update({ where: { id: threadId }, data: { isPinned } });
}

export async function setLocked(threadId: string, isLocked: boolean): Promise<void> {
  await prisma.discussionThread.update({ where: { id: threadId }, data: { isLocked } });
}

export async function setResolved(threadId: string, isResolved: boolean): Promise<void> {
  await prisma.discussionThread.update({ where: { id: threadId }, data: { isResolved } });
}

export async function touchLastActivity(threadId: string): Promise<void> {
  await prisma.discussionThread.update({ where: { id: threadId }, data: { lastActivityAt: new Date() } });
}

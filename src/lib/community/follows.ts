import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

export async function toggleFollow(userId: string, threadId: string): Promise<{ following: boolean }> {
  const existing = await prisma.discussionFollow.findUnique({
    where: { userId_threadId: { userId, threadId } },
  });
  if (existing) {
    await prisma.discussionFollow.delete({ where: { id: existing.id } });
    return { following: false };
  }
  const tenantId = await getTenantId();
  try {
    await prisma.discussionFollow.create({ data: { userId, threadId, tenantId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { following: true };
    throw e;
  }
  return { following: true };
}

export async function autoFollow(userId: string, threadId: string): Promise<void> {
  const tenantId = await getTenantId();
  await prisma.discussionFollow.upsert({
    where: { userId_threadId: { userId, threadId } },
    create: { userId, threadId, tenantId },
    update: {},
  });
}

export async function isFollowing(userId: string, threadId: string): Promise<boolean> {
  const row = await prisma.discussionFollow.findUnique({ where: { userId_threadId: { userId, threadId } } });
  return row != null;
}

export async function getThreadFollowerIds(threadId: string, excludeUserId?: string): Promise<string[]> {
  const rows = await prisma.discussionFollow.findMany({ where: { threadId }, select: { userId: true } });
  return rows.map((r) => r.userId).filter((id) => id !== excludeUserId);
}

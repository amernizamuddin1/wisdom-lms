import "server-only";
import { prisma } from "@/lib/prisma";

// A recipient row existing for this user + the notification being currently
// PUBLISHED and not expired is what makes it visible to that learner — the
// same visibility rule used by both the unread count and the list.
function visibleNotificationWhere(userId: string) {
  return {
    userId,
    notification: {
      status: "PUBLISHED" as const,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notificationRecipient.count({
    where: { ...visibleNotificationWhere(userId), readAt: null },
  });
}

export async function getNotificationsForUser(userId: string, take = 20) {
  const rows = await prisma.notificationRecipient.findMany({
    where: visibleNotificationWhere(userId),
    orderBy: { deliveredAt: "desc" },
    take,
    include: { notification: true },
  });

  return rows.map((r) => ({
    recipientId: r.id,
    readAt: r.readAt,
    deliveredAt: r.deliveredAt,
    id: r.notification.id,
    title: r.notification.title,
    richContent: r.notification.richContent,
    imageUrl: r.notification.imageUrl,
    ctaLabel: r.notification.ctaLabel,
    ctaUrl: r.notification.ctaUrl,
    priority: r.notification.priority,
  }));
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await prisma.notificationRecipient.updateMany({
    where: { userId, notificationId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notificationRecipient.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function clearReadNotifications(userId: string): Promise<number> {
  const result = await prisma.notificationRecipient.deleteMany({
    where: { userId, readAt: { not: null } },
  });
  return result.count;
}

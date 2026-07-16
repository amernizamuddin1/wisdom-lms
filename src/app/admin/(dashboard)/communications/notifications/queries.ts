import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationStatus, Prisma } from "@/generated/prisma/client";

export type NotificationListParams = {
  status?: string;
  q?: string;
};

export function buildNotificationWhere(params: NotificationListParams): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = {};

  // PUBLISHED/EXPIRED aren't distinct stored states — a notification is
  // PUBLISHED in the DB the whole time; "expired" is purely a function of
  // expiresAt vs now, computed here rather than via a background job.
  if (params.status === "PUBLISHED") {
    where.status = "PUBLISHED";
    where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
  } else if (params.status === "EXPIRED") {
    where.status = "PUBLISHED";
    where.expiresAt = { lt: new Date() };
  } else if (params.status && params.status !== "any") {
    where.status = params.status as NotificationStatus;
  }
  if (params.q) {
    where.OR = [
      { internalName: { contains: params.q, mode: "insensitive" } },
      { title: { contains: params.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function fetchNotifications(params: NotificationListParams) {
  const now = Date.now();
  const rows = await prisma.notification.findMany({
    where: buildNotificationWhere(params),
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { recipients: true } },
    },
  });

  return rows.map((n) => ({
    ...n,
    isExpired: n.status === "PUBLISHED" && n.expiresAt != null && n.expiresAt.getTime() < now,
  }));
}

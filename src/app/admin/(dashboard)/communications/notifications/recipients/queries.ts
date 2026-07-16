import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type RecipientListParams = {
  readStatus?: string;
  olderThan?: string;
  from?: string;
  to?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function buildRecipientWhere(params: RecipientListParams): Prisma.NotificationRecipientWhereInput {
  const where: Prisma.NotificationRecipientWhereInput = {};

  if (params.readStatus === "read") {
    where.readAt = { not: null };
  } else if (params.readStatus === "unread") {
    where.readAt = null;
  }

  const olderThanDays = Number(params.olderThan);
  if (params.olderThan && [30, 60, 90].includes(olderThanDays)) {
    where.deliveredAt = { lt: new Date(Date.now() - olderThanDays * MS_PER_DAY) };
  } else if (params.from || params.to) {
    where.deliveredAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
  }

  return where;
}

export async function fetchNotificationRecipients(params: RecipientListParams) {
  const rows = await prisma.notificationRecipient.findMany({
    where: buildRecipientWhere(params),
    orderBy: { deliveredAt: "desc" },
    take: 200,
    include: {
      notification: { select: { title: true, internalName: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    notificationTitle: r.notification.title || r.notification.internalName,
    userName: r.user.name,
    userEmail: r.user.email,
    deliveredAt: r.deliveredAt,
    readAt: r.readAt,
  }));
}

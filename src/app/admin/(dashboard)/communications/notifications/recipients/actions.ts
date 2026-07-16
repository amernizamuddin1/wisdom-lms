"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function deleteNotificationRecipient(recipientId: string) {
  await requireAdmin();
  await prisma.notificationRecipient.delete({ where: { id: recipientId } });
  revalidatePath("/admin/communications/notifications/recipients");
}

export type BulkDeleteRecipientsResult = { deletedCount: number };

export async function bulkDeleteNotificationRecipients(
  recipientIds: string[],
): Promise<BulkDeleteRecipientsResult> {
  await requireAdmin();
  if (recipientIds.length === 0) return { deletedCount: 0 };

  const result = await prisma.notificationRecipient.deleteMany({
    where: { id: { in: recipientIds } },
  });

  revalidatePath("/admin/communications/notifications/recipients");
  return { deletedCount: result.count };
}

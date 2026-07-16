"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} from "@/lib/communications/notifications";

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  await markNotificationRead(user.id, notificationId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
}

export async function clearReadNotificationsAction() {
  const user = await requireUser();
  await clearReadNotifications(user.id);
  revalidatePath("/", "layout");
}

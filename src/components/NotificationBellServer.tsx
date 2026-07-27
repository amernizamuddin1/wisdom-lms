import { cache } from "react";
import { BellIcon } from "lucide-react";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "@/lib/communications/notifications";
import NotificationBell from "@/components/NotificationBell";

const getNotificationBellData = cache(async function getNotificationBellData(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(userId),
    getUnreadNotificationCount(userId),
  ]);
  return { notifications, unreadCount };
});

export async function NotificationBellServer({ userId }: { userId: string }) {
  const { notifications, unreadCount } = await getNotificationBellData(userId);
  return <NotificationBell notifications={notifications} unreadCount={unreadCount} />;
}

export function NotificationBellFallback() {
  return (
    <span
      className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground"
      aria-label="Loading notifications"
    >
      <BellIcon className="size-4" />
    </span>
  );
}

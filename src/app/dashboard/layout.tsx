import { requireUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { getNotificationsForUser, getUnreadNotificationCount } from "@/lib/communications/notifications";
import DashboardChrome from "@/components/DashboardChrome";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, branding] = await Promise.all([requireUser(), getBranding()]);
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  return (
    <DashboardChrome
      userEmail={user.email}
      platformName={branding.platformName}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardChrome>
  );
}

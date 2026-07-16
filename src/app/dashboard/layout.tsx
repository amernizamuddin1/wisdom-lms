import { requireUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { getNotificationsForUser, getUnreadNotificationCount } from "@/lib/communications/notifications";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import StudentSidebar from "@/components/StudentSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import UnlockWatcher from "@/components/gamification/UnlockWatcher";

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
    <SidebarProvider>
      <UnlockWatcher />
      <StudentSidebar userEmail={user.email} platformName={branding.platformName} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium text-foreground">{branding.platformName}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell notifications={notifications} unreadCount={unreadCount} />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

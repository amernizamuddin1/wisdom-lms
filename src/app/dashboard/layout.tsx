import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import DashboardChrome from "@/components/DashboardChrome";
import {
  NotificationBellFallback,
  NotificationBellServer,
} from "@/components/NotificationBellServer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, branding] = await Promise.all([requireUser(), getBranding()]);

  return (
    <DashboardChrome
      userEmail={user.email}
      platformName={branding.platformName}
      notificationBell={
        <Suspense fallback={<NotificationBellFallback />}>
          <NotificationBellServer userId={user.id} />
        </Suspense>
      }
    >
      {children}
    </DashboardChrome>
  );
}

"use client";

import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import StudentSidebar from "@/components/StudentSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import UnlockWatcher from "@/components/gamification/UnlockWatcher";

export default function DashboardChrome({
  userEmail,
  platformName,
  notificationBell,
  children,
}: {
  userEmail: string;
  platformName: string;
  notificationBell: React.ReactNode;
  children: React.ReactNode;
}) {
  // The global rail stays permanently collapsed to an icon strip (per design:
  // it must never push the course-player content). Any attempt to expand it —
  // the header trigger, or the primitive's built-in Ctrl/Cmd+B shortcut — is
  // redirected into opening the flyout below instead of the pane widening
  // in-place.
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  return (
    <SidebarProvider
      open={false}
      onOpenChange={() => setFlyoutOpen(true)}
      style={{ "--sidebar-width-icon": "4.5rem" } as React.CSSProperties}
    >
      <UnlockWatcher />
      <StudentSidebar
        userEmail={userEmail}
        platformName={platformName}
        flyoutOpen={flyoutOpen}
        onFlyoutOpenChange={setFlyoutOpen}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <Separator orientation="vertical" className="h-4 md:hidden" />
            <span className="text-sm font-medium text-foreground">{platformName}</span>
          </div>
          <div className="flex items-center gap-2">
            {notificationBell}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

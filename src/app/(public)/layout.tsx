import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { GraduationCapIcon } from "lucide-react";
import { getBranding } from "@/lib/branding";
import { getOptionalTenantContext } from "@/lib/tenant-context";
import { getOptionalUser } from "@/lib/auth";
import { WISDOMQUANT_SITE_URL, WISDOMQUANT_TENANT_SLUG } from "@/lib/tenant-theme";
import ThemeToggle from "@/components/ThemeToggle";
import DashboardChrome from "@/components/DashboardChrome";
import {
  NotificationBellFallback,
  NotificationBellServer,
} from "@/components/NotificationBellServer";
import {
  default as PublicUserControls,
  PublicUserControlsFallback,
} from "@/components/PublicUserControls";
import PublicMobileNav from "./PublicMobileNav";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, tenant, user] = await Promise.all([
    getBranding(),
    getOptionalTenantContext(),
    getOptionalUser(),
  ]);
  const isWisdomQuant = tenant?.tenantSlug === WISDOMQUANT_TENANT_SLUG;

  // A logged-in visitor gets the same persistent sidebar shell as /dashboard
  // on every page here (catalog browsing, cart, checkout) — one continuous
  // app experience instead of switching between a marketing header and the
  // app shell mid-session. Logged-out visitors keep the marketing chrome below.
  if (user) {
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-(--header-height) max-w-(--content-width) items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {branding.logoUrl ? (
              <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card">
                <Image
                  src={branding.logoUrl}
                  alt="Logo"
                  width={32}
                  height={32}
                  className="size-full object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCapIcon className="size-4" />
              </div>
            )}
            <span className="font-semibold text-foreground">{branding.platformName}</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            {isWisdomQuant && (
              <Link
                href={WISDOMQUANT_SITE_URL}
                className="hidden text-sm font-medium text-muted-foreground hover:text-primary md:inline-block"
              >
                ← wisdomquant.com
              </Link>
            )}
            <Link
              href="/courses"
              className="hidden text-sm font-medium text-foreground hover:text-primary sm:inline-block"
            >
              Courses
            </Link>
            <Link
              href="/bundles"
              className="hidden text-sm font-medium text-foreground hover:text-primary sm:inline-block"
            >
              Bundles
            </Link>
            <PublicMobileNav isWisdomQuant={isWisdomQuant} wisdomQuantSiteUrl={WISDOMQUANT_SITE_URL} />
            <ThemeToggle />
            <Suspense fallback={<PublicUserControlsFallback />}>
              <PublicUserControls />
            </Suspense>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card py-6">
        <div className="mx-auto max-w-(--content-width) px-4 text-center text-sm text-muted-foreground sm:px-6">
          {branding.footerText || `© ${new Date().getFullYear()} ${branding.platformName}. All rights reserved.`}
        </div>
      </footer>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { GraduationCapIcon, ShoppingCartIcon } from "lucide-react";
import { getOptionalUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { getCartItemCount } from "@/lib/cart";
import { getOptionalTenantContext } from "@/lib/tenant-context";
import { WISDOMQUANT_SITE_URL, WISDOMQUANT_TENANT_SLUG } from "@/lib/tenant-theme";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  NotificationBellFallback,
  NotificationBellServer,
} from "@/components/NotificationBellServer";
import PublicMobileNav from "./PublicMobileNav";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, branding, tenant] = await Promise.all([
    getOptionalUser(),
    getBranding(),
    getOptionalTenantContext(),
  ]);
  const isWisdomQuant = tenant?.tenantSlug === WISDOMQUANT_TENANT_SLUG;
  const cartItemCount = user ? await getCartItemCount(user.id) : 0;

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
            {user ? (
              <>
                <Suspense fallback={<NotificationBellFallback />}>
                  <NotificationBellServer userId={user.id} />
                </Suspense>
                <Button asChild size="icon" variant="outline" className="relative">
                  <Link href="/cart" aria-label={`Cart${cartItemCount > 0 ? ` (${cartItemCount} items)` : ""}`}>
                    <ShoppingCartIcon className="size-4" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                        {cartItemCount > 9 ? "9+" : cartItemCount}
                      </span>
                    )}
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/dashboard">My Dashboard</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Log In</Link>
              </Button>
            )}
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

import Link from "next/link";
import { getOptionalUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const [user, branding] = await Promise.all([getOptionalUser(), getBranding()]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/community" className="font-semibold text-foreground">
              {branding.platformName} Community
            </Link>
            <nav className="hidden items-center gap-4 sm:flex">
              <Link href="/community" className="text-sm font-medium text-foreground hover:text-primary">
                Home
              </Link>
              {user && (
                <Link href="/community/my-activity" className="text-sm font-medium text-foreground hover:text-primary">
                  My Activity
                </Link>
              )}
            </nav>
          </div>

          <nav className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/community/new">Start Discussion</Link>
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>

      <footer className="border-t bg-card py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          {branding.footerText || `© ${new Date().getFullYear()} ${branding.platformName}. All rights reserved.`}
        </div>
      </footer>
    </div>
  );
}

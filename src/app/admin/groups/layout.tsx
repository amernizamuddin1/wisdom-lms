import Link from "next/link";
import { requireAdminOrGroupAdmin } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import ThemeToggle from "@/components/ThemeToggle";
import GroupsLogoutButton from "./GroupsLogoutButton";

// Deliberately outside src/app/admin/(dashboard) — that tree's layout gates on
// requireAdmin() (ADMIN only) and a couple of its pages (the dashboard home,
// enrollments/new) only enforce that gate at the layout level rather than in
// the page itself, which would leak them to a GROUP_ADMIN if the shared layout
// were loosened. This tree gets its own minimal shell instead, gated by
// requireAdminOrGroupAdmin(); each page underneath still does its own precise
// check (requireAdmin for admin-only screens, requireGroupAccess(groupId) for
// screens a scoped GROUP_ADMIN may also reach).
export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const { scope } = await requireAdminOrGroupAdmin();
  const branding = await getBranding();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link href={scope.role === "ADMIN" ? "/admin" : `/admin/groups/${scope.groupId}`} className="text-sm font-medium text-foreground">
          {branding.platformName} — Institutions
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <GroupsLogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}

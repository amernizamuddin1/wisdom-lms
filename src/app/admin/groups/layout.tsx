import Link from "next/link";
import { requireAdminOrGroupAdmin } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import AdminSidebar from "@/components/AdminSidebar";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import ThemeToggle from "@/components/ThemeToggle";
import GroupsLogoutButton from "./GroupsLogoutButton";

// Deliberately outside src/app/admin/(dashboard) — that tree's layout gates on
// requireAdmin() (ADMIN only) and a couple of its pages (the dashboard home,
// enrollments/new) only enforce that gate at the layout level rather than in
// the page itself, which would leak them to a GROUP_ADMIN if the shared layout
// were loosened. This tree gets its own gate instead, via requireAdminOrGroupAdmin();
// each page underneath still does its own precise check (requireAdmin for
// admin-only screens, requireGroupAccess(groupId) for screens a scoped
// GROUP_ADMIN may also reach). A full ADMIN gets the same sidebar shell as the
// rest of the dashboard here since none of that leak risk applies to them; a
// GROUP_ADMIN still gets the minimal shell with no links into ADMIN-only pages.
export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const { profile, scope } = await requireAdminOrGroupAdmin();
  const branding = await getBranding();

  if (scope.role === "ADMIN") {
    return (
      <SidebarProvider>
        <AdminSidebar userEmail={profile.email} logoUrl={branding.logoUrl} platformName={branding.platformName} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4" />
              <AdminBreadcrumb />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link href={`/admin/groups/${scope.groupId}`} className="text-sm font-medium text-foreground">
          {branding.platformName} — Institutions
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <GroupsLogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <AdminBreadcrumb />
      </div>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}

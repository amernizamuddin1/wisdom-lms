"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  Building2Icon,
  FlagIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  MailIcon,
  MessagesSquareIcon,
  PackageIcon,
  ReceiptIcon,
  ScrollTextIcon,
  Settings2Icon,
  SettingsIcon,
  TagsIcon,
  TicketPercentIcon,
  UserCogIcon,
  UserPlusIcon,
  UsersIcon,
  UserSearchIcon,
  UserXIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import LogoutButton from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: LineChartIcon, exact: false },
  { href: "/admin/courses", label: "Courses", icon: GraduationCapIcon, exact: false },
  { href: "/admin/bundles", label: "Course Bundles", icon: PackageIcon, exact: false },
  { href: "/admin/instructors", label: "Instructors", icon: UserCogIcon, exact: false },
  { href: "/admin/groups", label: "Institutions", icon: Building2Icon, exact: false },
  { href: "/admin/orders", label: "Orders", icon: ReceiptIcon, exact: false },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercentIcon, exact: false },
  { href: "/admin/enrollments/new", label: "Enrollments", icon: UserPlusIcon, exact: false },
  { href: "/admin/reports/enrollments", label: "Reports", icon: BarChart3Icon, exact: false },
  { href: "/admin/communications/emails", label: "Communications", icon: MailIcon, exact: false },
  { href: "/admin/community", label: "Community", icon: MessagesSquareIcon, exact: true },
  { href: "/admin/community/discussions", label: "Discussions", icon: MessagesSquareIcon, exact: false },
  { href: "/admin/community/categories", label: "Discussion Categories", icon: TagsIcon, exact: false },
  { href: "/admin/community/reports", label: "Community Reports", icon: FlagIcon, exact: false },
  { href: "/admin/community/restricted-users", label: "Restricted Users", icon: UserXIcon, exact: false },
  { href: "/admin/community/moderation-log", label: "Moderation Log", icon: ScrollTextIcon, exact: false },
  { href: "/admin/community/settings", label: "Community Settings", icon: Settings2Icon, exact: false },
  { href: "/admin/users", label: "Users", icon: UsersIcon, exact: false },
  { href: "/admin/users/subscribers", label: "Subscribers", icon: UserSearchIcon, exact: false },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon, exact: false },
];

export default function AdminSidebar({
  userEmail,
  logoUrl,
  platformName,
}: {
  userEmail: string;
  logoUrl?: string | null;
  platformName: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                {logoUrl ? (
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card">
                    <Image
                      src={logoUrl}
                      alt="Logo"
                      width={32}
                      height={32}
                      className="size-full object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <GraduationCapIcon className="size-4" />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{platformName}</span>
                  <span className="text-xs text-muted-foreground">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="truncate px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              {userEmail}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

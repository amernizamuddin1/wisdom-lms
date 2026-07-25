"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import {
  AwardIcon,
  BarChart3Icon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PanelLeftOpenIcon,
  ReceiptIcon,
  TrophyIcon,
  UserIcon,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import LogoutButton, { useLogout } from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "My Courses", icon: LayoutDashboardIcon, exact: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3Icon, exact: false },
  { href: "/dashboard/achievements", label: "Achievements", icon: TrophyIcon, exact: false },
  { href: "/dashboard/orders", label: "Order History", icon: ReceiptIcon, exact: false },
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon, exact: false },
  { href: "/dashboard/certificates", label: "Certificates", icon: AwardIcon, exact: false },
];

export default function StudentSidebar({
  userEmail,
  platformName,
  flyoutOpen,
  onFlyoutOpenChange,
}: {
  userEmail: string;
  platformName: string;
  flyoutOpen: boolean;
  onFlyoutOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const handleLogout = useLogout();
  const expandButtonRef = useRef<HTMLButtonElement>(null);

  function isItemActive(item: (typeof NAV_ITEMS)[number]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <GraduationCapIcon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{platformName}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className="hidden md:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={expandButtonRef}
                    type="button"
                    onClick={() => onFlyoutOpenChange(true)}
                    aria-label="Expand navigation"
                    className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
                  >
                    <PanelLeftOpenIcon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand navigation</TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isItemActive(item)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <LogoutButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <Sheet open={flyoutOpen} onOpenChange={onFlyoutOpenChange}>
        <SheetContent
          side="left"
          className="w-[250px] gap-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            expandButtonRef.current?.focus();
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Learner navigation menu</SheetDescription>
          </SheetHeader>

          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b p-3">
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCapIcon className="size-4" />
              </div>
              <span className="truncate font-semibold text-foreground">{platformName}</span>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV_ITEMS.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onFlyoutOpenChange(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-2 border-t p-3">
              <div className="truncate px-2 py-1 text-xs text-muted-foreground">{userEmail}</div>
              <button
                type="button"
                onClick={() => {
                  onFlyoutOpenChange(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOutIcon className="size-4 shrink-0" />
                Log out
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

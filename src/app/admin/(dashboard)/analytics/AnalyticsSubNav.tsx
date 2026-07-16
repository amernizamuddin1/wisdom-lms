"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/analytics", label: "Overview", exact: true },
  { href: "/admin/analytics/learners", label: "Learners" },
  { href: "/admin/analytics/quizzes", label: "Quizzes" },
  { href: "/admin/analytics/engagement", label: "Engagement" },
  { href: "/admin/analytics/retention", label: "Retention" },
  { href: "/admin/analytics/gamification", label: "Gamification" },
  { href: "/admin/analytics/community", label: "Community" },
  { href: "/admin/analytics/commerce", label: "Commerce" },
];

export default function AnalyticsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-px" aria-label="Analytics sections">
      {TABS.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

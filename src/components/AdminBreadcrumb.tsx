"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LABEL_MAP: Record<string, string> = {
  admin: "Dashboard",
  analytics: "Analytics",
  courses: "Courses",
  lessons: "Lessons",
  bundles: "Course Bundles",
  instructors: "Instructors",
  groups: "Institutions",
  admins: "Sub-admins",
  "bulk-import": "Bulk Import",
  orders: "Orders",
  coupons: "Coupons",
  enrollments: "Enrollments",
  reports: "Reports",
  communications: "Communications",
  emails: "Emails",
  community: "Community",
  discussions: "Discussions",
  categories: "Discussion Categories",
  "restricted-users": "Restricted Users",
  "moderation-log": "Moderation Log",
  settings: "Settings",
  users: "Users",
  subscribers: "Subscribers",
  new: "New",
};

function labelFor(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).filter((s) => !UUID_RE.test(s));

  if (segments.length === 0 || segments[0] !== "admin") return null;

  const crumbs = segments.map((segment, index) => ({
    label: labelFor(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <ChevronRightIcon className="size-3.5 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

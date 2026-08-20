"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function labelFor(segment: string, labelMap: Record<string, string>): string {
  if (labelMap[segment]) return labelMap[segment];
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Derives a breadcrumb trail from the current pathname alone — no data
// fetching, so dynamic ID segments (uuids) are simply omitted rather than
// resolved to an entity name. Shared by AdminBreadcrumb and StudentBreadcrumb,
// which each supply their own label map for the segments under their area.
export default function Breadcrumb({
  rootSegment,
  labelMap,
}: {
  rootSegment: string;
  labelMap: Record<string, string>;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).filter((s) => !UUID_RE.test(s));

  if (segments.length === 0 || segments[0] !== rootSegment) return null;

  const crumbs = segments.map((segment, index) => ({
    label: labelFor(segment, labelMap),
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

import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Server-friendly (no client JS) sortable column header — mirrors the
// existing link-based Pagination component's convention.
export default function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  basePath,
  params,
  className,
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  basePath: string;
  params: Record<string, string | undefined>;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc";

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  search.set("sort", sortKey);
  search.set("sortDir", nextDir);
  search.delete("page");

  return (
    <Link
      href={`${basePath}?${search.toString()}`}
      className={cn("inline-flex items-center gap-1 font-medium hover:text-foreground", className)}
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? (
          <ArrowUpIcon className="size-3" />
        ) : (
          <ArrowDownIcon className="size-3" />
        )
      ) : (
        <ArrowUpDownIcon className="size-3 opacity-40" />
      )}
    </Link>
  );
}

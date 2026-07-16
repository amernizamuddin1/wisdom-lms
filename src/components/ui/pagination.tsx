import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Simple link-based pagination (server-friendly — no client JS required).
// `buildHref` receives the target page number and returns the URL for it.
export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-2", className)}
    >
      <PaginationLink href={buildHref(page - 1)} disabled={prevDisabled} aria-label="Previous page">
        <ChevronLeftIcon className="size-4" />
        Previous
      </PaginationLink>
      <span className="px-2 text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <PaginationLink href={buildHref(page + 1)} disabled={nextDisabled} aria-label="Next page">
        Next
        <ChevronRightIcon className="size-4" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
  ...props
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
} & React.ComponentProps<"a">) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))} {...props}>
      {children}
    </Link>
  );
}

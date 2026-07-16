import Link from "next/link";
import { SearchIcon, MessageSquarePlusIcon } from "lucide-react";
import { getOptionalUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listThreads } from "@/lib/community/threads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import CategoryCard from "@/components/community/CategoryCard";
import ThreadCard from "@/components/community/ThreadCard";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "LATEST", label: "Latest" },
  { value: "POPULAR", label: "Popular" },
  { value: "UNANSWERED", label: "Unanswered" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

export default async function CommunityHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const user = await getOptionalUser();
  const q = params.q?.trim() || "";
  const sort = (params.sort ?? "LATEST").toUpperCase();
  const page = Math.max(1, Number(params.page) || 1);

  const [categories, threadsResult] = await Promise.all([
    prisma.communityCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { threads: { where: { status: "ACTIVE" } } } } },
    }),
    listThreads(
      {
        search: q || undefined,
        sort: sort === "POPULAR" ? "POPULAR" : sort === "UNANSWERED" ? "UNANSWERED" : "LATEST",
        resolvedOnly: sort === "RESOLVED" ? true : undefined,
      },
      page,
      20,
    ),
  ]);

  function buildHref(overrides: { q?: string; sort?: string; page?: number }): string {
    const sp = new URLSearchParams();
    const nextQ = overrides.q !== undefined ? overrides.q : q;
    const nextSort = overrides.sort !== undefined ? overrides.sort : sort;
    const nextPage = overrides.page !== undefined ? overrides.page : page;
    if (nextQ) sp.set("q", nextQ);
    if (nextSort && nextSort !== "LATEST") sp.set("sort", nextSort);
    if (nextPage && nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/community?${qs}` : "/community";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Community</h1>
          <p className="text-sm text-muted-foreground">Ask questions, share ideas, and connect with other learners.</p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link href="/community/new">
            <MessageSquarePlusIcon className="size-4" />
            Start Discussion
          </Link>
        </Button>
      </div>

      <form action="/community" method="get" className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" name="q" defaultValue={q} placeholder="Search discussions..." className="pl-9" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {categories.length > 0 && !q && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Categories</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                slug={category.slug}
                name={category.name}
                description={category.description}
                threadCount={category._count.threads}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {q ? (
            <h2 className="font-semibold text-foreground">Search results for &ldquo;{q}&rdquo;</h2>
          ) : (
            SORTS.map((s) => (
              <Link
                key={s.value}
                href={buildHref({ sort: s.value, page: 1 })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  sort === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {s.label}
              </Link>
            ))
          )}
        </div>

        {threadsResult.items.length === 0 ? (
          <EmptyState
            title="No discussions yet"
            description={q ? "Try a different search term." : "Be the first to start a conversation."}
            action={
              !q &&
              (user ? (
                <Button asChild size="sm">
                  <Link href="/community/new">Start Discussion</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link href="/login">Log in to post</Link>
                </Button>
              ))
            }
          />
        ) : (
          <div className="space-y-2">
            {threadsResult.items.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={20}
          total={threadsResult.total}
          buildHref={(p) => buildHref({ page: p })}
        />
      </div>
    </div>
  );
}

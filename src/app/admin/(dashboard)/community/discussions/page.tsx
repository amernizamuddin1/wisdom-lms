import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { MessageSquareIcon } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

function statusVariant(status: string): "success" | "secondary" | "destructive" {
  if (status === "ACTIVE") return "success";
  if (status === "HIDDEN") return "secondary";
  return "destructive";
}

export default async function AdminDiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    categoryId?: string;
    scope?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();
  const { status, categoryId, scope, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.DiscussionThreadWhereInput = {
    status: status && status !== "ALL" ? (status as "ACTIVE" | "HIDDEN" | "DELETED") : undefined,
    categoryId: categoryId || undefined,
    courseId: scope === "GLOBAL" ? null : scope === "COURSE" ? { not: null } : undefined,
    title: q ? { contains: q, mode: "insensitive" } : undefined,
  };

  const [threads, total, categories] = await Promise.all([
    prisma.discussionThread.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { lastActivityAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true, email: true } },
        category: { select: { name: true } },
        course: { select: { title: true } },
        _count: { select: { answers: true, replies: true } },
      },
    }),
    prisma.discussionThread.count({ where }),
    prisma.communityCategory.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (categoryId) qs.set("categoryId", categoryId);
  if (scope) qs.set("scope", scope);
  if (q) qs.set("q", q);
  const baseQs = qs.toString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Discussions</h2>
          <p className="text-sm text-muted-foreground">All threads, including hidden and deleted.</p>
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search title..."
            className="h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? "ALL"}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="HIDDEN">Hidden</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="scope">
            Scope
          </label>
          <select
            id="scope"
            name="scope"
            defaultValue={scope ?? "ALL"}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="ALL">All</option>
            <option value="GLOBAL">Global</option>
            <option value="COURSE">Course</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="categoryId">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-muted"
        >
          Apply
        </button>
      </form>

      {threads.length === 0 ? (
        <EmptyState icon={MessageSquareIcon} title="No discussions found" description="Try adjusting the filters." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Category / Course</th>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {threads.map((thread) => (
                <tr key={thread.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/community/discussions/${thread.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {thread.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {thread.author.name ?? thread.author.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {thread.course?.title ?? thread.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {thread._count.answers} answers · {thread._count.replies} replies
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(thread.status)}>{thread.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {thread.isPinned && <Badge variant="outline">Pinned</Badge>}
                      {thread.isLocked && <Badge variant="outline">Locked</Badge>}
                      {thread.isResolved && <Badge variant="outline">Resolved</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => `/admin/community/discussions?${baseQs ? baseQs + "&" : ""}page=${p}`}
      />
    </div>
  );
}

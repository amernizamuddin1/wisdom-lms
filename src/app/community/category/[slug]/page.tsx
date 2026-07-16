import { notFound } from "next/navigation";
import { getOptionalUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listThreads } from "@/lib/community/threads";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import ThreadCard from "@/components/community/ThreadCard";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const category = await prisma.communityCategory.findUnique({ where: { slug } });
  if (!category || !category.isActive) notFound();

  // Global categories in the seed are all PUBLIC; ENROLLED_ONLY visibility is
  // course-scoped elsewhere, so here we just require sign-in as a v1 gate.
  if (category.visibilityType === "ENROLLED_ONLY") {
    await requireUser();
  } else {
    await getOptionalUser();
  }

  const result = await listThreads({ categoryId: category.id }, page, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{category.name}</h1>
        {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}
      </div>

      {result.items.length === 0 ? (
        <EmptyState title="No discussions in this category yet" />
      ) : (
        <div className="space-y-2">
          {result.items.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={20}
        total={result.total}
        buildHref={(p) => `/community/category/${slug}${p > 1 ? `?page=${p}` : ""}`}
      />
    </div>
  );
}

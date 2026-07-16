import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CategoryForm from "../CategoryForm";
import CategoryActions from "./CategoryActions";

export default async function CategoryEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const category = await prisma.communityCategory.findUnique({
    where: { id },
    include: { _count: { select: { threads: true } } },
  });
  if (!category) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{category.name}</h2>
          <p className="text-sm text-muted-foreground">{category._count.threads} threads</p>
        </div>
        <CategoryActions categoryId={category.id} isActive={category.isActive} />
      </div>

      <CategoryForm
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          displayOrder: category.displayOrder,
          isActive: category.isActive,
          visibilityType: category.visibilityType,
          postingPermission: category.postingPermission,
        }}
      />
    </div>
  );
}

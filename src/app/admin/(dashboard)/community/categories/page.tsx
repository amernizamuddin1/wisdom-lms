import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function CommunityCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.communityCategory.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { threads: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Categories</h2>
        <Button asChild>
          <Link href="/admin/community/categories/new">New Category</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 font-medium">Posting</th>
              <th className="px-4 py-3 font-medium">Threads</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/community/categories/${category.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {category.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{category.displayOrder}</td>
                <td className="px-4 py-3 text-muted-foreground">{category.visibilityType}</td>
                <td className="px-4 py-3 text-muted-foreground">{category.postingPermission}</td>
                <td className="px-4 py-3 text-muted-foreground">{category._count.threads}</td>
                <td className="px-4 py-3">
                  <Badge variant={category.isActive ? "success" : "secondary"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

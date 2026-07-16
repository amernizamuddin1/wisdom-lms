import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [subscribers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } },
            bundleEnrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Subscribers</h2>
      </div>

      <form method="get" className="max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email..."
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Active Courses</th>
              <th className="px-4 py-3 font-medium">Active Bundles</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subscribers.map((s) => (
              <tr key={s.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{s._count.enrollments}</td>
                <td className="px-4 py-3 text-muted-foreground">{s._count.bundleEnrollments}</td>
                <td className="px-4 py-3">
                  <Badge variant="success">Active</Badge>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/subscribers/${s.id}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No subscribers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} subscribers)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/users/subscribers?page=${page - 1}${qParam}`}
                className="rounded-md border px-3 py-1.5 hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users/subscribers?page=${page + 1}${qParam}`}
                className="rounded-md border px-3 py-1.5 hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

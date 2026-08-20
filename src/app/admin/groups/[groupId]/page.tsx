import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGroupAccess, getGroupScope } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function GroupRosterPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const profile = await requireGroupAccess(groupId);
  const scope = await getGroupScope(profile.id);
  const tenantId = await getTenantId();

  const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
  if (!group) notFound();

  const members = await prisma.groupMembership.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          _count: { select: { enrollments: true, bundleEnrollments: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/admin/groups/${groupId}/bulk-import`}>Bulk Import (CSV)</Link>
          </Button>
          {scope?.role === "ADMIN" && (
            <Button asChild variant="outline">
              <Link href={`/admin/groups/${groupId}/admins`}>Manage Sub-admin</Link>
            </Button>
          )}
        </div>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No members yet. Use Bulk Import to upload a CSV of this institution&apos;s members.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Course access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-foreground">{m.user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.user._count.enrollments + m.user._count.bundleEnrollments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

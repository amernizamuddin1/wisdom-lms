import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function GroupsPage() {
  await requireAdmin();
  const tenantId = await getTenantId();

  const groups = await prisma.group.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true } },
      adminMemberships: {
        where: { role: "GROUP_ADMIN", status: "ACTIVE" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Institutions</h1>
          <p className="text-sm text-muted-foreground">
            Schools, colleges, or companies onboarded under this tenant, each with their own roster and sub-admin.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/groups/new">New Institution</Link>
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No institutions yet. Create one to start onboarding a school or company.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Members</th>
                <th className="px-4 py-2 font-medium">Sub-admin</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groups.map((group) => {
                const admin = group.adminMemberships[0]?.user;
                return (
                  <tr key={group.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/groups/${group.id}`} className="font-medium text-foreground hover:underline">
                        {group.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{group.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{group._count.memberships}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {admin ? `${admin.name} (${admin.email})` : "Not assigned"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={group.status === "ACTIVE" ? "success" : "outline"}>{group.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

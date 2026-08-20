import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import AssignAdminForm from "./AssignAdminForm";
import RevokeAdminButton from "./RevokeAdminButton";
import { Card, CardContent } from "@/components/ui/card";

export default async function GroupAdminsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  await requireAdmin();
  const { groupId } = await params;
  const tenantId = await getTenantId();

  const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
  if (!group) notFound();

  const currentAdmins = await prisma.tenantMembership.findMany({
    where: { tenantId, groupId, role: "GROUP_ADMIN" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Sub-admin — {group.name}</h1>
        <p className="text-sm text-muted-foreground">
          A sub-admin can only manage this institution&apos;s roster and course assignments.
        </p>
      </div>

      {currentAdmins.length > 0 && (
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Current sub-admin</h2>
            {currentAdmins.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>
                  {m.user.name} ({m.user.email})
                </span>
                <RevokeAdminButton groupId={groupId} userId={m.user.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AssignAdminForm groupId={groupId} />
    </div>
  );
}

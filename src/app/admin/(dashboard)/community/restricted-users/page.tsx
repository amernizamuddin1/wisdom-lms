import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { UserXIcon } from "lucide-react";
import RestrictUserForm from "./RestrictUserForm";
import LiftRestrictionButton from "./LiftRestrictionButton";

export default async function RestrictedUsersPage() {
  await requireAdmin();

  const restrictions = await prisma.communityUserRestriction.findMany({
    where: { liftedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Restricted Users</h2>
        <p className="text-sm text-muted-foreground">Users currently blocked from posting in the community.</p>
      </div>

      <RestrictUserForm />

      {restrictions.length === 0 ? (
        <EmptyState icon={UserXIcon} title="No active restrictions" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {restrictions.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{r.user.name ?? r.user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.restrictionType === "PERMANENT" ? "destructive" : "secondary"}>
                      {r.restrictionType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.expiresAt ? r.expiresAt.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.createdBy.name ?? r.createdBy.email}
                  </td>
                  <td className="px-4 py-3">
                    <LiftRestrictionButton restrictionId={r.id} />
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

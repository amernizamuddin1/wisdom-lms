"use server";

import { revalidatePath } from "next/cache";
import { requireGroupAccess } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import type { MembershipStatus } from "@/generated/prisma/client";

// Pause/reactivate toggles TenantMembership.status, which already gates login
// tenant-wide (see getActiveMembership in @/lib/auth) — nothing new to model.
// Scoped to requireGroupAccess so a GROUP_ADMIN can manage their own roster,
// matching the bulk-import actions in this same route tree.
export async function setMemberStatus(
  groupId: string,
  userId: string,
  status: MembershipStatus,
): Promise<{ error?: string }> {
  await requireGroupAccess(groupId);
  const tenantId = await getTenantId();

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) return { error: "This person is not a member of this institution." };

  await prisma.tenantMembership.update({
    where: { tenantId_userId: { tenantId, userId } },
    data: { status },
  });

  revalidatePath(`/admin/groups/${groupId}`);
  return {};
}

// Removes only the GroupMembership row — does not touch the user's
// TenantMembership, course access, or account. "Remove from this
// institution", not "delete this person".
export async function removeFromGroup(groupId: string, userId: string): Promise<{ error?: string }> {
  await requireGroupAccess(groupId);

  await prisma.groupMembership.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  revalidatePath(`/admin/groups/${groupId}`);
  return {};
}

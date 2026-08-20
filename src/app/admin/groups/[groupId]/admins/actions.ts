"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; success?: boolean };

// Sub-admin assignment is admin-only and always scopes the target user to
// exactly one group at a time — assigning them to a new group here simply
// overwrites the previous groupId on their single TenantMembership row.
export async function assignGroupAdmin(
  groupId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
  if (!group) return { error: "Institution not found." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: `No user found with the email "${email}". They need an account before you can make them a sub-admin.` };
  }

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    create: { tenantId, userId: user.id, role: "GROUP_ADMIN", groupId },
    update: { role: "GROUP_ADMIN", groupId, status: "ACTIVE" },
  });

  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath(`/admin/groups/${groupId}/admins`);
  return { success: true };
}

export async function revokeGroupAdmin(groupId: string, userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const tenantId = await getTenantId();

  await prisma.tenantMembership.update({
    where: { tenantId_userId: { tenantId, userId } },
    data: { role: "STUDENT", groupId: null },
  });

  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath(`/admin/groups/${groupId}/admins`);
  return {};
}

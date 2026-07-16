"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { logModerationAction } from "@/lib/community/moderation";

export type ActionState = { error?: string; success?: boolean };

export async function restrictUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const identifier = String(formData.get("identifier") ?? "").trim();
  const restrictionType = String(formData.get("restrictionType") ?? "TEMPORARY") as "TEMPORARY" | "PERMANENT";
  const reason = String(formData.get("reason") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

  if (!identifier) return { error: "Enter a user ID or email." };
  if (!reason) return { error: "A reason is required." };
  if (restrictionType === "TEMPORARY" && !expiresAtRaw) {
    return { error: "Temporary restrictions require an expiry date." };
  }

  const user = await prisma.user.findFirst({
    where: identifier.includes("@") ? { email: identifier } : { id: identifier },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { error: "No user found with that ID or email." };

  const existing = await prisma.communityUserRestriction.findFirst({
    where: { userId: user.id, liftedAt: null },
  });
  if (existing) return { error: `${user.name ?? user.email} already has an active restriction.` };

  const expiresAt = restrictionType === "TEMPORARY" ? new Date(expiresAtRaw) : null;
  if (restrictionType === "TEMPORARY" && (!expiresAt || Number.isNaN(expiresAt.getTime()))) {
    return { error: "Enter a valid expiry date." };
  }

  await prisma.$transaction(async (tx) => {
    const restriction = await tx.communityUserRestriction.create({
      data: {
        userId: user.id,
        restrictionType,
        reason,
        expiresAt,
        createdById: admin.id,
        tenantId,
      },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "RESTRICT_USER",
      targetUserId: user.id,
      entityType: "COMMUNITY_USER_RESTRICTION",
      entityId: restriction.id,
      reason,
    });
  });

  revalidatePath("/admin/community/restricted-users");
  return { success: true };
}

export async function liftRestrictionAction(restrictionId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  const restriction = await prisma.communityUserRestriction.findUniqueOrThrow({ where: { id: restrictionId } });

  if (restriction.liftedAt) return { error: "This restriction is already lifted." };

  await prisma.$transaction(async (tx) => {
    await tx.communityUserRestriction.update({
      where: { id: restrictionId },
      data: { liftedById: admin.id, liftedAt: new Date() },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "RESTORE_POSTING",
      targetUserId: restriction.userId,
      entityType: "COMMUNITY_USER_RESTRICTION",
      entityId: restrictionId,
    });
  });

  revalidatePath("/admin/community/restricted-users");
  return { success: true };
}

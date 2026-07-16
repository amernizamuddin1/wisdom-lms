"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeGrant, revokeBundleEnrollment } from "@/lib/entitlements";

export type RevokeActionState = { error?: string; success?: boolean };

export async function revokeCourseGrants(
  subscriberId: string,
  grantIds: string[],
  reason: string | null,
): Promise<RevokeActionState> {
  const admin = await requireAdmin();
  if (grantIds.length === 0) return { error: "Select at least one enrollment." };

  try {
    await prisma.$transaction(async (tx) => {
      for (const grantId of grantIds) {
        await revokeGrant(tx, { grantId, adminId: admin.id, reason });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not remove access." };
  }

  revalidatePath(`/admin/users/subscribers/${subscriberId}`);
  return { success: true };
}

export async function revokeBundle(
  subscriberId: string,
  bundleEnrollmentId: string,
  reason: string | null,
): Promise<RevokeActionState> {
  const admin = await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      await revokeBundleEnrollment(tx, { bundleEnrollmentId, adminId: admin.id, reason });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not remove access." };
  }

  revalidatePath(`/admin/users/subscribers/${subscriberId}`);
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueRefund } from "@/lib/refunds";

export type RefundActionState = { error?: string; success?: boolean };

export async function issueOrderRefund(
  orderId: string,
  amount: number,
  reason: string | null,
): Promise<RefundActionState> {
  const admin = await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      await issueRefund(tx, { orderId, amount, reason, issuedByAdminId: admin.id });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not issue refund." };
  }

  revalidatePath("/admin/orders");
  return { success: true };
}

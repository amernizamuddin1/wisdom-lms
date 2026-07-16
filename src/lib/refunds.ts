import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

// Minimal refund-recording primitive — creates the audit-trail Refund row and
// updates Order.status to reflect it. This does not call any payment
// gateway's refund API; it exists so admins have somewhere to record a
// refund that was actually issued (via Razorpay's dashboard or another
// channel) and so Phase 3 Commercial Intelligence has real data to report
// on. Supports partial refunds: amount is validated against what's already
// been refunded on this order, not just the order total.
export async function issueRefund(
  tx: Tx,
  params: { orderId: string; amount: number; reason: string | null; issuedByAdminId: string },
): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: params.orderId },
    include: { refunds: true },
  });

  if (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED") {
    throw new Error("Only paid orders can be refunded.");
  }

  const alreadyRefunded = order.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
  const remaining = Number(order.totalAmount) - alreadyRefunded;
  if (params.amount <= 0 || params.amount > remaining) {
    throw new Error(`Refund amount must be between 0 and ${remaining.toFixed(2)}.`);
  }

  const tenantId = await getTenantId();
  await tx.refund.create({
    data: {
      tenantId,
      orderId: order.id,
      amount: params.amount,
      currency: order.currency,
      reason: params.reason,
      issuedByAdminId: params.issuedByAdminId,
    },
  });

  const isFullRefund = alreadyRefunded + params.amount >= Number(order.totalAmount);
  await tx.order.update({
    where: { id: order.id },
    data: { status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
}

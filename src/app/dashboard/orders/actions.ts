"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateOrderReceiptPdf } from "@/lib/receipt";

export type DownloadReceiptState = { error?: string; base64?: string; filename?: string };

// Shared by both the student dashboard and the admin orders page (server actions
// aren't tied to one route) — caller must either own the order or be an admin,
// which is a different check shape than the strict single-role requireUser()/
// requireAdmin() helpers, so it's done inline here.
export async function downloadOrderReceiptAction(orderId: string): Promise<DownloadReceiptState> {
  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  if (!sessionUser) return { error: "Please log in." };

  const profile = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!profile) return { error: "Please log in." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true, user: true },
  });
  if (!order) return { error: "Order not found." };

  if (order.userId !== profile.id && profile.role !== "ADMIN") {
    return { error: "You don't have access to this order." };
  }
  if (order.status !== "PAID") {
    return { error: "A receipt is only available for a completed order." };
  }

  const bytes = await generateOrderReceiptPdf(order);
  const base64 = Buffer.from(bytes).toString("base64");

  return { base64, filename: `receipt-${order.orderNumber}.pdf` };
}

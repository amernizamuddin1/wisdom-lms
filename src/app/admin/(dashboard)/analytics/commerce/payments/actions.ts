"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getPaymentHealth } from "@/lib/analytics/commerce-payments";

export type PaymentHealthCsvParams = { range?: string; from?: string; to?: string };

export async function exportFailedPaymentsCsv(params: PaymentHealthCsvParams): Promise<string> {
  await requireAdmin();
  const range = resolveDateRange(params);
  const result = await getPaymentHealth(range);

  const header = ["Order #", "Learner Name", "Learner Email", "Gateway", "Gateway Order ID", "Date"];
  const csvRows = result.failedPayments.map((r) => [
    r.orderNumber,
    r.userName,
    r.userEmail,
    r.gateway ?? "",
    r.gatewayOrderId ?? "",
    r.createdAt.toISOString(),
  ]);

  return buildCsv([header, ...csvRows]);
}

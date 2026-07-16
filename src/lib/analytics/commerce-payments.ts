import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { ANALYTICS_ROW_CAP } from "./shared";

export type PaymentStatusCounts = {
  completed: number;
  failed: number;
  pending: number;
};

export type PaymentGatewayCount = {
  gateway: "RAZORPAY" | "STRIPE" | "FREE";
  count: number;
};

export type FailedPaymentRow = {
  orderPaymentId: string;
  orderNumber: string;
  userEmail: string;
  userName: string;
  gateway: "RAZORPAY" | "STRIPE" | null;
  gatewayOrderId: string | null;
  createdAt: Date;
};

export type PaymentHealthResult = {
  statusCounts: PaymentStatusCounts;
  gatewayCounts: PaymentGatewayCount[];
  averageTimeToPayMinutes: number | null;
  abandonedPendingCount: number;
  failedPayments: FailedPaymentRow[];
};

// Payment attempts older than 24h and still PENDING are treated as
// abandoned checkouts rather than "in flight" — Razorpay/Stripe sessions
// expire well within a day in practice, so a PENDING order this old is a
// documented heuristic for "the learner never completed checkout," not a
// still-active payment.
const ABANDONED_PENDING_HOURS = 24;

// Payment health data source for the admin Commercial Intelligence
// dashboard — raw counts only (no MIN_PAYMENT_SAMPLE_SIZE gating here; that
// threshold is applied by the insights module that consumes this shape).
export async function getPaymentHealth(range: ResolvedRange): Promise<PaymentHealthResult> {
  const abandonedCutoff = new Date(Date.now() - ABANDONED_PENDING_HOURS * 60 * 60 * 1000);

  const [statusGroups, gatewayGroups, paidOrders, abandonedPendingCount, failedRows] = await Promise.all([
    prisma.orderPayment.groupBy({
      by: ["status"],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: true,
    }),
    prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: range.from, lte: range.to } },
      select: { createdAt: true, paidAt: true },
      take: ANALYTICS_ROW_CAP,
    }),
    prisma.order.count({
      where: { status: "PENDING", createdAt: { lt: abandonedCutoff } },
    }),
    prisma.orderPayment.findMany({
      where: { status: "FAILED", createdAt: { gte: range.from, lte: range.to } },
      select: {
        id: true,
        gateway: true,
        gatewayOrderId: true,
        createdAt: true,
        order: { select: { orderNumber: true, user: { select: { email: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const statusCounts: PaymentStatusCounts = {
    completed: statusGroups.find((g) => g.status === "COMPLETED")?._count ?? 0,
    failed: statusGroups.find((g) => g.status === "FAILED")?._count ?? 0,
    pending: statusGroups.find((g) => g.status === "PENDING")?._count ?? 0,
  };

  // Order.paymentMethod is RAZORPAY or FREE (Stripe is a supported
  // OrderPayment.gateway value but not yet a checkout paymentMethod on
  // Order) — grouping by Order here rather than OrderPayment.gateway
  // matches "one row per order regardless of payment outcome" so FREE
  // orders (which never get an OrderPayment row) still show up.
  const gatewayCounts: PaymentGatewayCount[] = gatewayGroups.map((g) => ({
    gateway: g.paymentMethod as "RAZORPAY" | "FREE",
    count: g._count,
  }));

  const durationsMinutes = paidOrders
    .filter((o) => o.paidAt)
    .map((o) => (o.paidAt!.getTime() - o.createdAt.getTime()) / 60000);
  const averageTimeToPayMinutes =
    durationsMinutes.length === 0
      ? null
      : Math.round((durationsMinutes.reduce((s, d) => s + d, 0) / durationsMinutes.length) * 10) / 10;

  const failedPayments: FailedPaymentRow[] = failedRows.map((row) => ({
    orderPaymentId: row.id,
    orderNumber: row.order.orderNumber,
    userEmail: row.order.user.email,
    userName: row.order.user.name,
    gateway: row.gateway,
    gatewayOrderId: row.gatewayOrderId,
    createdAt: row.createdAt,
  }));

  return {
    statusCounts,
    gatewayCounts,
    averageTimeToPayMinutes,
    abandonedPendingCount,
    failedPayments,
  };
}

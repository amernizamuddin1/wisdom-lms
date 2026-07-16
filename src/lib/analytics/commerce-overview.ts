import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResolvedRange } from "./date-range";
import { changePercent } from "./date-range";
import { getPaidOrderItems, sumItemDiscounts, sumCouponDiscounts } from "./commerce-shared";

export type CommerceKpi = { value: number; changePercent: number | null };

export type CommerceKpis = {
  grossRevenue: CommerceKpi;
  netRevenue: CommerceKpi;
  transactions: CommerceKpi;
  payingLearners: CommerceKpi;
  averageOrderValue: CommerceKpi;
  revenuePerLearner: CommerceKpi;
  refundAmount: CommerceKpi;
  discountValueGiven: CommerceKpi;
  paymentSuccessRate: CommerceKpi;
};

// One window's worth of the raw aggregates the 9 KPIs below are derived
// from — computed twice (current + previous window) so every KPI can report
// a changePercent via date-range.ts's own null-on-zero-denominator rule.
async function windowAggregates(from: Date, to: Date) {
  const [orderAgg, refundAgg, payingLearnerRows, paidItems, paymentCounts] = await Promise.all([
    // Order-level gross revenue + transaction count — NOT a sum of
    // OrderItem.finalPrice, which would double-attribute AOV/per-order
    // figures whenever an order contains more than one line item (see
    // definitions.ts's Phase 3 "Gross revenue" note).
    prisma.order.aggregate({
      where: { status: "PAID", paidAt: { gte: from, lte: to } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.refund.aggregate({
      where: { refundedAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: from, lte: to } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // Item-level rows are only needed for the discount breakdown (sale-price
    // + coupon discounts), not the top-line revenue KPI above.
    getPaidOrderItems({ key: "custom", from, to, previousFrom: from, previousTo: to }),
    prisma.orderPayment.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
    }),
  ]);

  const grossRevenue = Number(orderAgg._sum.totalAmount ?? 0);
  const transactions = orderAgg._count;
  const payingLearners = payingLearnerRows.length;
  const refundAmount = Number(refundAgg._sum.amount ?? 0);
  const discountValueGiven = sumItemDiscounts(paidItems) + sumCouponDiscounts(paidItems);

  const completed = paymentCounts.find((p) => p.status === "COMPLETED")?._count ?? 0;
  const totalPayments = paymentCounts.reduce((s, p) => s + p._count, 0);

  return {
    grossRevenue,
    netRevenue: grossRevenue - refundAmount,
    transactions,
    payingLearners,
    averageOrderValue: transactions === 0 ? 0 : grossRevenue / transactions,
    revenuePerLearner: payingLearners === 0 ? 0 : grossRevenue / payingLearners,
    refundAmount,
    discountValueGiven,
    // 0-100, one decimal — matches changePercent's own rounding convention.
    // Null-safe: 0 total payments reports 0%, not NaN.
    paymentSuccessRate: totalPayments === 0 ? 0 : Math.round((completed / totalPayments) * 1000) / 10,
  };
}

function kpi(current: number, previous: number): CommerceKpi {
  return { value: current, changePercent: changePercent(current, previous) };
}

// The 9 headline Commercial Intelligence KPIs, each with a period-over-period
// changePercent against range.previousFrom/previousTo. Current and previous
// windows are independent aggregate-query sets run in parallel — course/
// order counts here are small, catalog-bounded aggregates, not per-entity
// loops, so this isn't the "parallelize per catalog entity" pattern used
// elsewhere in this directory (see courses.ts).
export async function getCommerceKpis(range: ResolvedRange): Promise<CommerceKpis> {
  const [current, previous] = await Promise.all([
    windowAggregates(range.from, range.to),
    windowAggregates(range.previousFrom, range.previousTo),
  ]);

  return {
    grossRevenue: kpi(current.grossRevenue, previous.grossRevenue),
    netRevenue: kpi(current.netRevenue, previous.netRevenue),
    transactions: kpi(current.transactions, previous.transactions),
    payingLearners: kpi(current.payingLearners, previous.payingLearners),
    averageOrderValue: kpi(current.averageOrderValue, previous.averageOrderValue),
    revenuePerLearner: kpi(current.revenuePerLearner, previous.revenuePerLearner),
    refundAmount: kpi(current.refundAmount, previous.refundAmount),
    discountValueGiven: kpi(current.discountValueGiven, previous.discountValueGiven),
    paymentSuccessRate: kpi(current.paymentSuccessRate, previous.paymentSuccessRate),
  };
}

import "server-only";
// Commercial (pre-purchase) funnel — PRODUCT_VIEWED -> ADDED_TO_CART ->
// CHECKOUT_STARTED -> PAYMENT_INITIATED -> PAID. This is a distinct concept
// from the learning-progress funnel in ./funnel.ts (ENROLLED -> STARTED ->
// REACHED_25/50/75 -> COMPLETED) — do not import from or reference that
// file, and never conflate the two funnels in a UI.
//
// CommerceEvent rows only exist from this feature's ship date forward, so
// any date range before that shows zero/near-zero counts for every stage
// except PAID (which is read from Order, with full history). PRODUCT_VIEWED
// (and every stage before PAID) also only ever fires for authenticated
// visitors — there is no anonymous/session id anywhere in the app to key an
// anonymous event on. Callers must caption both of these limitations next to
// the chart; this module does not render the caption itself.
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ResolvedRange } from "./date-range";
import { ANALYTICS_ROW_CAP } from "./shared";
import { COMMERCIAL_FUNNEL_STAGES, COMMERCIAL_FUNNEL_STAGE_LABELS, type CommercialFunnelStage } from "./definitions";

export type CommercialFunnelFilters = {
  courseId?: string | null;
  bundleId?: string | null;
};

export type CommercialFunnelStageRow = {
  stage: CommercialFunnelStage;
  label: string;
  count: number;
  percentOfViewed: number;
};

export type CommercialFunnelResult = {
  stages: CommercialFunnelStageRow[];
};

async function distinctEventUserCount(
  stage: Exclude<CommercialFunnelStage, "PAID">,
  range: ResolvedRange,
  filters: CommercialFunnelFilters,
): Promise<number> {
  const where: Prisma.CommerceEventWhereInput = {
    type: stage,
    createdAt: { gte: range.from, lte: range.to },
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.bundleId ? { bundleId: filters.bundleId } : {}),
  };
  const rows = await prisma.commerceEvent.findMany({
    where,
    select: { userId: true },
    distinct: ["userId"],
    take: ANALYTICS_ROW_CAP,
  });
  // userId is nullable in the schema (anonymous visitors are conceptually
  // possible) but this deployment never writes an anonymous row in
  // practice — filtered defensively rather than assumed away.
  return rows.filter((r) => r.userId !== null).length;
}

async function distinctPaidUserCount(range: ResolvedRange, filters: CommercialFunnelFilters): Promise<number> {
  const where: Prisma.OrderWhereInput = {
    status: "PAID",
    paidAt: { gte: range.from, lte: range.to },
    ...(filters.courseId || filters.bundleId
      ? {
          items: {
            some: {
              ...(filters.courseId ? { courseId: filters.courseId } : {}),
              ...(filters.bundleId ? { bundleId: filters.bundleId } : {}),
            },
          },
        }
      : {}),
  };
  const rows = await prisma.order.findMany({
    where,
    select: { userId: true },
    distinct: ["userId"],
    take: ANALYTICS_ROW_CAP,
  });
  return rows.length;
}

// Builds the 5-stage commercial funnel for the range, each stage counted as
// distinct authenticated users (never event count) so a single user
// repeatedly viewing/re-adding a product doesn't inflate the funnel.
// percentOfViewed is always relative to PRODUCT_VIEWED, this funnel's top of
// funnel — a stage-over-previous-stage percentage isn't computed here since
// funnel drop-off framing belongs to the page/insights layer, not this data
// source.
export async function getCommercialFunnel(
  range: ResolvedRange,
  filters?: CommercialFunnelFilters,
): Promise<CommercialFunnelResult> {
  const f = filters ?? {};
  const eventStages = COMMERCIAL_FUNNEL_STAGES.filter((s): s is Exclude<CommercialFunnelStage, "PAID"> => s !== "PAID");

  const [eventCounts, paidCount] = await Promise.all([
    Promise.all(eventStages.map((stage) => distinctEventUserCount(stage, range, f))),
    distinctPaidUserCount(range, f),
  ]);

  const countByStage = new Map<CommercialFunnelStage, number>();
  eventStages.forEach((stage, i) => countByStage.set(stage, eventCounts[i]));
  countByStage.set("PAID", paidCount);

  const viewedCount = countByStage.get("PRODUCT_VIEWED") ?? 0;

  const stages: CommercialFunnelStageRow[] = COMMERCIAL_FUNNEL_STAGES.map((stage) => {
    const count = countByStage.get(stage) ?? 0;
    return {
      stage,
      label: COMMERCIAL_FUNNEL_STAGE_LABELS[stage],
      count,
      percentOfViewed: viewedCount === 0 ? 0 : Math.round((count / viewedCount) * 1000) / 10,
    };
  });

  return { stages };
}

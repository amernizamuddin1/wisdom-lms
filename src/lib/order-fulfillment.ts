import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma, type EnrollmentSource } from "@/generated/prisma/client";
import { grantBundleAccess } from "@/lib/bundle-access";
import { grantCourseAccess } from "@/lib/entitlements";
import { computeAccess, durationChoiceFor } from "@/lib/access";
import { sendMail } from "@/lib/email";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

type OrderItemRow = {
  itemType: "COURSE" | "BUNDLE";
  courseId: string | null;
  bundleId: string | null;
  titleSnapshot: string;
  originalPrice: Prisma.Decimal;
  finalPrice: Prisma.Decimal;
};

// Grants access for a single order item. Course items use the course's own
// accessDurationMonths/isPermanentAccess config (same convention as
// CourseBundle, see lib/access.ts::computeAccess), never shortening an
// existing enrollment: upgrading to permanent/no-end-date is always >= any
// prior window. Bundle items reuse the existing grantBundleAccess fan-out
// helper as-is.
async function grantOrderItemAccess(
  tx: Tx,
  params: { userId: string; item: OrderItemRow; source: EnrollmentSource; orderId: string },
) {
  if (params.item.itemType === "COURSE" && params.item.courseId) {
    const course = await tx.course.findUniqueOrThrow({
      where: { id: params.item.courseId },
      select: { accessDurationMonths: true, isPermanentAccess: true },
    });
    const startAt = new Date();
    const access = course.isPermanentAccess
      ? computeAccess(startAt, "forever", null)
      : computeAccess(startAt, durationChoiceFor(course.accessDurationMonths), null);

    await grantCourseAccess(tx, {
      userId: params.userId,
      courseId: params.item.courseId,
      source: params.source,
      sourceOrderId: params.orderId,
      startAt,
      accessEndAt: access.accessEndAt,
      accessDurationMonths: access.accessDurationMonths,
      isPermanent: access.isPermanent,
    });
  } else if (params.item.itemType === "BUNDLE" && params.item.bundleId) {
    await grantBundleAccess(tx, {
      userId: params.userId,
      bundleId: params.item.bundleId,
      startAt: new Date(),
      sourceOrderId: params.orderId,
    });
  }
}

// If an item was bought at its currently-active discounted price, bump the
// discount's usage counter — mirrors the existing single-course logic in
// lib/payments.ts::finalizeRazorpayPayment.
async function bumpDiscountUsage(tx: Tx, item: OrderItemRow) {
  const original = Number(item.originalPrice);
  const final = Number(item.finalPrice);
  if (final >= original) return; // no discount applied

  if (item.itemType === "COURSE" && item.courseId) {
    const priceRow = await tx.coursePrice.findUnique({
      where: { courseId_currency: { courseId: item.courseId, currency: "INR" } },
    });
    if (priceRow?.discountedPrice != null && Number(priceRow.discountedPrice) === final) {
      await tx.coursePrice.update({
        where: { id: priceRow.id },
        data: { discountedEnrollmentsUsed: { increment: 1 } },
      });
    }
  } else if (item.itemType === "BUNDLE" && item.bundleId) {
    const priceRow = await tx.bundlePrice.findUnique({
      where: { bundleId_currency: { bundleId: item.bundleId, currency: "INR" } },
    });
    if (priceRow?.discountedPrice != null && Number(priceRow.discountedPrice) === final) {
      await tx.bundlePrice.update({
        where: { id: priceRow.id },
        data: { discountedEnrollmentsUsed: { increment: 1 } },
      });
    }
  }
}

// Records the coupon redemption and bumps the coupon's usage counter — only
// called from inside the fulfillment transaction (never at order-creation
// time), so an abandoned/pending order never consumes a limited-use coupon.
// CouponRedemption.orderId is unique, so this is naturally idempotent within
// the same safety net as the rest of fulfillment (a re-run on an already-PAID
// order returns early before reaching this call).
async function bumpCouponUsage(
  tx: Tx,
  order: { id: string; userId: string; couponId: string | null; couponDiscountAmount: Prisma.Decimal },
) {
  if (!order.couponId) return;

  const tenantId = await getTenantId();
  await tx.couponRedemption.create({
    data: {
      tenantId,
      couponId: order.couponId,
      userId: order.userId,
      orderId: order.id,
      discountAmount: order.couponDiscountAmount,
    },
  });
  await tx.coupon.update({
    where: { id: order.couponId },
    data: { redemptionsUsed: { increment: 1 } },
  });
}

async function sendOrderConfirmationEmail(userId: string, orderNumber: string, items: OrderItemRow[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const itemList = items.map((i) => `<li>${i.titleSnapshot}</li>`).join("");
  void sendMail({
    to: user.email,
    subject: `Order ${orderNumber} confirmed`,
    html: `<p>Hi ${user.name},</p><p>Your order <strong>${orderNumber}</strong> is confirmed. You now have access to:</p><ul>${itemList}</ul>`,
  });
}

export interface FulfillPaidOrderParams {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

// Idempotent on OrderPayment.gatewayPaymentId (unique constraint) — safe to call
// from both the client-verify path and the webhook, mirroring
// lib/payments.ts::finalizeRazorpayPayment's proven approach.
export async function fulfillPaidOrder(
  params: FulfillPaidOrderParams,
): Promise<{ alreadyProcessed: boolean }> {
  const existing = await prisma.orderPayment.findUnique({
    where: { gatewayPaymentId: params.gatewayPaymentId },
  });
  if (existing) return { alreadyProcessed: true };

  let items: OrderItemRow[] = [];
  let userId = "";
  let orderNumber = "";

  const tenantId = await getTenantId();
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: params.orderId },
        include: { items: true },
      });
      if (order.status === "PAID") return;

      await tx.orderPayment.create({
        data: {
          tenantId,
          orderId: order.id,
          gateway: "RAZORPAY",
          gatewayOrderId: params.gatewayOrderId,
          gatewayPaymentId: params.gatewayPaymentId,
          gatewaySignature: params.gatewaySignature,
          status: "COMPLETED",
        },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } });

      for (const item of order.items) {
        await grantOrderItemAccess(tx, { userId: order.userId, item, source: "DIRECT", orderId: order.id });
        await bumpDiscountUsage(tx, item);
      }
      await bumpCouponUsage(tx, order);

      await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });

      items = order.items;
      userId = order.userId;
      orderNumber = order.orderNumber;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { alreadyProcessed: true };
    }
    throw e;
  }

  if (userId) void sendOrderConfirmationEmail(userId, orderNumber, items);
  return { alreadyProcessed: false };
}

// Idempotent on OrderPayment.orderId (unique constraint) — a double-submit of
// "Complete Enrollment" races on the same insert and the loser gets P2002.
export async function fulfillFreeOrder(orderId: string): Promise<{ alreadyProcessed: boolean }> {
  let items: OrderItemRow[] = [];
  let userId = "";
  let orderNumber = "";

  const tenantId = await getTenantId();
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
      if (order.status === "PAID") return;

      await tx.orderPayment.create({
        data: { tenantId, orderId: order.id, gateway: null, status: "COMPLETED" },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: new Date(), paymentMethod: "FREE" },
      });

      for (const item of order.items) {
        await grantOrderItemAccess(tx, {
          userId: order.userId,
          item,
          source: "FREE_CHECKOUT",
          orderId: order.id,
        });
      }
      await bumpCouponUsage(tx, order);

      await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });

      items = order.items;
      userId = order.userId;
      orderNumber = order.orderNumber;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { alreadyProcessed: true };
    }
    throw e;
  }

  if (userId) void sendOrderConfirmationEmail(userId, orderNumber, items);
  return { alreadyProcessed: false };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { effectivePrice } from "@/lib/pricing";
import { validateAndComputeCoupon } from "@/lib/coupons";
import type { CartItemType } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

export interface OrderItemInput {
  itemType: CartItemType;
  courseId?: string;
  bundleId?: string;
}

export interface PricedOrderItem {
  itemType: CartItemType;
  courseId: string | null;
  bundleId: string | null;
  titleSnapshot: string;
  originalPrice: number;
  finalPrice: number;
}

export type PriceItemsResult =
  | { ok: true; items: PricedOrderItem[] }
  | { ok: false; error: string };

// Computes authoritative per-item prices server-side (never trusts client
// input) — shared by order creation and the live checkout coupon preview, so
// both always agree on what a cart is actually worth.
export async function computePricedOrderItems(inputItems: OrderItemInput[]): Promise<PriceItemsResult> {
  const items: PricedOrderItem[] = [];

  for (const input of inputItems) {
    if (input.itemType === "COURSE" && input.courseId) {
      const course = await prisma.course.findFirst({
        where: { id: input.courseId, status: "PUBLISHED" },
        include: { prices: { where: { currency: "INR" } } },
      });
      if (!course) return { ok: false, error: "One of the courses in your cart is no longer available." };

      if (course.isFree) {
        items.push({
          itemType: "COURSE",
          courseId: course.id,
          bundleId: null,
          titleSnapshot: course.title,
          originalPrice: 0,
          finalPrice: 0,
        });
        continue;
      }

      const priceRow = course.prices[0];
      if (!priceRow) {
        return { ok: false, error: `"${course.title}" doesn't have an INR price configured.` };
      }
      const priceInput = {
        amount: Number(priceRow.amount),
        discountedPrice: priceRow.discountedPrice != null ? Number(priceRow.discountedPrice) : null,
        discountStartAt: priceRow.discountStartAt,
        discountEndAt: priceRow.discountEndAt,
        maxDiscountedEnrollments: priceRow.maxDiscountedEnrollments,
        discountedEnrollmentsUsed: priceRow.discountedEnrollmentsUsed,
      };
      items.push({
        itemType: "COURSE",
        courseId: course.id,
        bundleId: null,
        titleSnapshot: course.title,
        originalPrice: priceInput.amount,
        finalPrice: effectivePrice(priceInput),
      });
    } else if (input.itemType === "BUNDLE" && input.bundleId) {
      const bundle = await prisma.courseBundle.findFirst({
        where: { id: input.bundleId, status: "ACTIVE" },
        include: { prices: { where: { currency: "INR" } } },
      });
      if (!bundle) return { ok: false, error: "One of the bundles in your cart is no longer available." };

      if (bundle.isFree) {
        items.push({
          itemType: "BUNDLE",
          courseId: null,
          bundleId: bundle.id,
          titleSnapshot: bundle.name,
          originalPrice: 0,
          finalPrice: 0,
        });
        continue;
      }

      const priceRow = bundle.prices[0];
      if (!priceRow) {
        return { ok: false, error: `"${bundle.name}" doesn't have an INR price configured.` };
      }
      const priceInput = {
        amount: Number(priceRow.amount),
        discountedPrice: priceRow.discountedPrice != null ? Number(priceRow.discountedPrice) : null,
        discountStartAt: priceRow.discountStartAt,
        discountEndAt: priceRow.discountEndAt,
        maxDiscountedEnrollments: priceRow.maxDiscountedEnrollments,
        discountedEnrollmentsUsed: priceRow.discountedEnrollmentsUsed,
      };
      items.push({
        itemType: "BUNDLE",
        courseId: null,
        bundleId: bundle.id,
        titleSnapshot: bundle.name,
        originalPrice: priceInput.amount,
        finalPrice: effectivePrice(priceInput),
      });
    }
  }

  return { ok: true, items };
}

function cartItemsToInput(items: { itemType: CartItemType; courseId: string | null; bundleId: string | null }[]): OrderItemInput[] {
  return items.map((item) =>
    item.itemType === "COURSE"
      ? { itemType: "COURSE" as const, courseId: item.courseId! }
      : { itemType: "BUNDLE" as const, bundleId: item.bundleId! },
  );
}

export type CreateOrderResult =
  | { ok: true; orderId: string; totalAmount: number; currency: "INR" }
  | { ok: false; error: string };

function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${stamp}${rand}`;
}

// Snapshots title/price into OrderItem rows and creates a PENDING Order. Does
// NOT clear the cart — that only happens on successful fulfillment (see
// order-fulfillment.ts) so a failed/abandoned payment doesn't lose cart contents.
// Currency is always INR: this app's only wired payment gateway (Razorpay) is
// INR-only, matching the existing single-course checkout's assumption.
export async function createOrderFromItems(
  userId: string,
  inputItems: OrderItemInput[],
  couponCode?: string,
): Promise<CreateOrderResult> {
  if (inputItems.length === 0) {
    return { ok: false, error: "Nothing to check out." };
  }

  const priced = await computePricedOrderItems(inputItems);
  if (!priced.ok) return priced;
  const orderItems = priced.items;

  const subtotal = orderItems.reduce((sum, i) => sum + i.originalPrice, 0);
  const preCouponTotal = orderItems.reduce((sum, i) => sum + i.finalPrice, 0);

  let couponId: string | null = null;
  let couponDiscountAmount = 0;
  const normalizedCouponCode = couponCode?.trim().toUpperCase() || null;
  if (normalizedCouponCode) {
    const couponResult = await validateAndComputeCoupon(normalizedCouponCode, orderItems, userId);
    if (!couponResult.ok) return { ok: false, error: couponResult.error };
    couponId = couponResult.couponId;
    couponDiscountAmount = couponResult.discountAmount;
  }

  const total = Math.max(0, preCouponTotal - couponDiscountAmount);

  const tenantId = await getTenantId();
  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNumber: generateOrderNumber(),
      userId,
      status: "PENDING",
      currency: "INR",
      subtotal,
      discountTotal: subtotal - preCouponTotal,
      totalAmount: total,
      paymentMethod: total === 0 ? "FREE" : "RAZORPAY",
      couponId,
      couponCode: normalizedCouponCode,
      couponDiscountAmount,
      items: { create: orderItems.map((item) => ({ ...item, tenantId })) },
    },
  });

  return { ok: true, orderId: order.id, totalAmount: total, currency: "INR" };
}

// Reads the user's cart and creates an Order from its contents.
export async function createOrderFromCart(
  userId: string,
  couponCode?: string,
): Promise<CreateOrderResult> {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  return createOrderFromItems(userId, cartItemsToInput(cart.items), couponCode);
}

export type PreviewCouponResult =
  | { ok: true; discountAmount: number }
  | { ok: false; error: string };

// Live checkout-page preview: prices the user's current cart exactly like
// createOrderFromCart would, then validates the coupon against it — without
// creating an Order or consuming any redemption. The real, authoritative
// application happens again (never trusting this preview) inside
// createOrderFromItems when the user actually confirms.
export async function previewCouponForCart(userId: string, couponCode: string): Promise<PreviewCouponResult> {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const priced = await computePricedOrderItems(cartItemsToInput(cart.items));
  if (!priced.ok) return { ok: false, error: priced.error };

  const result = await validateAndComputeCoupon(couponCode, priced.items, userId);
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true, discountAmount: result.discountAmount };
}

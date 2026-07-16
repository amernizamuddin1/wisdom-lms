import "server-only";
import { prisma } from "@/lib/prisma";

export interface CouponOrderItemInput {
  itemType: "COURSE" | "BUNDLE";
  courseId: string | null;
  bundleId: string | null;
  finalPrice: number;
}

export type CouponValidationResult =
  | { ok: true; couponId: string; discountAmount: number }
  | { ok: false; error: string };

// Authoritative coupon validation + discount computation — used both for the
// live checkout-page preview and at order-creation time (never trusts a
// client-supplied discount amount). Reuses whatever finalPrice the caller has
// already computed via effectivePrice() for each item, so per-item sale
// pricing and coupon discounts compose correctly (a course on sale can still
// have a coupon applied on top).
export async function validateAndComputeCoupon(
  code: string,
  orderItems: CouponOrderItemInput[],
  userId: string,
): Promise<CouponValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalized },
    include: { courses: true, bundles: true },
  });
  if (!coupon) return { ok: false, error: "Invalid coupon code." };
  if (!coupon.isActive) return { ok: false, error: "This coupon is no longer active." };

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return { ok: false, error: "This coupon isn't active yet." };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (coupon.maxRedemptions != null && coupon.redemptionsUsed >= coupon.maxRedemptions) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }
  if (coupon.maxRedemptionsPerUser != null) {
    const used = await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.maxRedemptionsPerUser) {
      return { ok: false, error: "You've already used this coupon." };
    }
  }

  const eligibleItems =
    coupon.scope === "ALL"
      ? orderItems
      : orderItems.filter((item) =>
          item.itemType === "COURSE"
            ? coupon.courses.some((c) => c.courseId === item.courseId)
            : coupon.bundles.some((b) => b.bundleId === item.bundleId),
        );

  if (coupon.scope === "SPECIFIC" && eligibleItems.length === 0) {
    return { ok: false, error: "This coupon doesn't apply to anything in your cart." };
  }

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.finalPrice, 0);

  if (coupon.minOrderAmount != null && eligibleSubtotal < Number(coupon.minOrderAmount)) {
    return {
      ok: false,
      error: `This coupon requires a minimum order of ₹${Number(coupon.minOrderAmount).toLocaleString()} on eligible items.`,
    };
  }

  let rawDiscount: number;
  if (coupon.type === "PERCENTAGE") {
    rawDiscount = (eligibleSubtotal * Number(coupon.value)) / 100;
    if (coupon.maxDiscountAmount != null) {
      rawDiscount = Math.min(rawDiscount, Number(coupon.maxDiscountAmount));
    }
  } else {
    rawDiscount = Math.min(Number(coupon.value), eligibleSubtotal);
  }

  const discountAmount = Math.max(0, Math.round(rawDiscount * 100) / 100);

  return { ok: true, couponId: coupon.id, discountAmount };
}

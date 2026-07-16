export interface DiscountFields {
  discountedPrice: number | null;
  discountStartAt: Date | null;
  discountEndAt: Date | null;
  maxDiscountedEnrollments: number | null;
  discountedEnrollmentsUsed: number;
}

// A discount is active only while every limit that's actually set (date window,
// enrolment cap) still holds — leaving a limit unset means "no limit" for that axis,
// so time-only / count-only / both / neither all fall out of the same checks.
export function isDiscountActive(price: DiscountFields, now: Date = new Date()): boolean {
  if (price.discountedPrice == null) return false;
  if (price.discountStartAt && now < price.discountStartAt) return false;
  if (price.discountEndAt && now > price.discountEndAt) return false;
  if (
    price.maxDiscountedEnrollments != null &&
    price.discountedEnrollmentsUsed >= price.maxDiscountedEnrollments
  ) {
    return false;
  }
  return true;
}

export function effectivePrice(
  price: DiscountFields & { amount: number },
  now: Date = new Date(),
): number {
  return isDiscountActive(price, now) ? price.discountedPrice! : price.amount;
}

export function discountPercentage(amount: number, discountedPrice: number): number {
  if (amount <= 0) return 0;
  return Math.round(((amount - discountedPrice) / amount) * 10000) / 100;
}

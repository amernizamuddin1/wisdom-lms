"use client";

import { useState } from "react";
import type { CartView } from "@/lib/cart";
import CouponInput from "./CouponInput";
import CheckoutPayButton from "./CheckoutPayButton";

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€" };

export default function CheckoutSummary({ cart }: { cart: CartView }) {
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(
    null,
  );

  const symbol = CURRENCY_SYMBOL[cart.currency] ?? "";
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, cart.total - couponDiscount);

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Order summary</h2>
        {cart.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-foreground">{item.title}</span>
            <span className="text-foreground">
              {item.effectivePrice === 0 ? "Free" : `${symbol}${item.effectivePrice.toLocaleString()}`}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>
            {symbol}
            {cart.subtotal.toLocaleString()}
          </span>
        </div>
        {cart.discountTotal > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Discount</span>
            <span>
              -{symbol}
              {cart.discountTotal.toLocaleString()}
            </span>
          </div>
        )}
        {appliedCoupon && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Coupon ({appliedCoupon.code})</span>
            <span>
              -{symbol}
              {couponDiscount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 text-base font-semibold text-foreground">
          <span>Total payable</span>
          <span>
            {symbol}
            {total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Have a coupon?</h2>
        <CouponInput
          onApplied={(code, discountAmount) => setAppliedCoupon({ code, discountAmount })}
          onRemoved={() => setAppliedCoupon(null)}
        />
      </div>

      <CheckoutPayButton isFree={total === 0} couponCode={appliedCoupon?.code} />
    </div>
  );
}

"use server";

import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { requireUser } from "@/lib/auth";
import { getRazorpayCredentials } from "@/lib/settings";
import { createOrderFromCart, previewCouponForCart } from "@/lib/orders";
import { fulfillFreeOrder, fulfillPaidOrder } from "@/lib/order-fulfillment";
import { logCommerceEvent } from "@/lib/commerce-events";
import { getTenantId } from "@/lib/tenant-context";

export type ConfirmCheckoutState = {
  error?: string;
  redirectTo?: string;
  razorpayOrder?: { internalOrderId: string; gatewayOrderId: string; amountPaise: number; keyId: string };
};

// Reads the logged-in user's cart, creates a PENDING Order with authoritative
// server-computed prices, then branches: an all-free order is fulfilled
// immediately (no gateway involved — Razorpay doesn't support zero-amount
// orders), a paid order gets a Razorpay order created against it, returned to
// the client to open the checkout modal.
export async function confirmCheckout(couponCode?: string): Promise<ConfirmCheckoutState> {
  const user = await requireUser();

  const orderResult = await createOrderFromCart(user.id, couponCode);
  if (!orderResult.ok) return { error: orderResult.error };

  logCommerceEvent({ userId: user.id, type: "PAYMENT_INITIATED", orderId: orderResult.orderId });

  if (orderResult.totalAmount === 0) {
    await fulfillFreeOrder(orderResult.orderId);
    return { redirectTo: `/checkout/success/${orderResult.orderId}` };
  }

  const creds = await getRazorpayCredentials();
  if (!creds) return { error: "Online payment isn't available right now." };

  const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
  const amountPaise = Math.round(orderResult.totalAmount * 100);

  // Stamped onto the Razorpay order so the webhook — which arrives with no
  // tenant subdomain/host to resolve from — can identify which tenant this
  // payment belongs to. See src/app/api/webhooks/razorpay/route.ts.
  const tenantId = await getTenantId();

  let gatewayOrder;
  try {
    gatewayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      notes: { orderId: orderResult.orderId, tenantId },
    });
  } catch {
    return { error: "Couldn't start checkout. Please try again." };
  }

  return {
    razorpayOrder: {
      internalOrderId: orderResult.orderId,
      gatewayOrderId: gatewayOrder.id,
      amountPaise,
      keyId: creds.keyId,
    },
  };
}

export type VerifyCheckoutPaymentState = { error?: string; redirectTo?: string };

export async function verifyCheckoutPayment(input: {
  gatewayOrderId: string;
  paymentId: string;
  signature: string;
}): Promise<VerifyCheckoutPaymentState> {
  await requireUser();

  const creds = await getRazorpayCredentials();
  if (!creds) return { error: "Payment verification is unavailable." };

  const expected = createHmac("sha256", creds.keySecret)
    .update(`${input.gatewayOrderId}|${input.paymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(input.signature, "hex");
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return { error: "Payment could not be verified. If you were charged, contact support." };
  }

  const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });

  let gatewayOrder;
  try {
    gatewayOrder = await razorpay.orders.fetch(input.gatewayOrderId);
  } catch {
    return { error: "Couldn't confirm your payment. If you were charged, contact support." };
  }

  const notes = (gatewayOrder.notes ?? {}) as Record<string, string>;
  const internalOrderId = notes.orderId;
  if (!internalOrderId) {
    return { error: "Couldn't confirm which order this payment was for. Contact support." };
  }

  try {
    await fulfillPaidOrder({
      orderId: internalOrderId,
      gatewayOrderId: input.gatewayOrderId,
      gatewayPaymentId: input.paymentId,
      gatewaySignature: input.signature,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Something went wrong finalizing your order.",
    };
  }

  return { redirectTo: `/checkout/success/${internalOrderId}` };
}

export type PreviewCouponState = { error?: string; discountAmount?: number };

// Live preview only — never grants the discount itself. The authoritative
// application happens again inside confirmCheckout → createOrderFromCart.
export async function previewCouponAction(code: string): Promise<PreviewCouponState> {
  const user = await requireUser();

  const result = await previewCouponForCart(user.id, code);
  if (!result.ok) return { error: result.error };

  return { discountAmount: result.discountAmount };
}

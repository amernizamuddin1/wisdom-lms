"use server";

import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getRazorpayCredentials } from "@/lib/settings";
import { effectivePrice } from "@/lib/pricing";
import { finalizeRazorpayPayment } from "@/lib/payments";
import { getTenantId } from "@/lib/tenant-context";

export type CreateOrderState = {
  error?: string;
  order?: { orderId: string; amountPaise: number; keyId: string };
};

export async function createRazorpayOrder(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const courseId = String(formData.get("courseId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const creds = await getRazorpayCredentials();
  if (!creds) {
    return { error: "Online payment isn't available right now." };
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "PUBLISHED", isFree: false },
    include: { prices: { where: { currency: "INR" } } },
  });
  if (!course) {
    return { error: "This course isn't available for enrollment." };
  }
  const priceRow = course.prices[0];
  if (!priceRow) {
    return { error: "This course doesn't have an INR price configured." };
  }

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  if (!sessionUser) {
    if (!name) return { error: "Name is required." };
    if (!email) return { error: "Email is required." };
  }

  // Authoritative amount — never trust a client-supplied price.
  const amountRupees = effectivePrice({
    amount: Number(priceRow.amount),
    discountedPrice: priceRow.discountedPrice != null ? Number(priceRow.discountedPrice) : null,
    discountStartAt: priceRow.discountStartAt,
    discountEndAt: priceRow.discountEndAt,
    maxDiscountedEnrollments: priceRow.maxDiscountedEnrollments,
    discountedEnrollmentsUsed: priceRow.discountedEnrollmentsUsed,
  });
  const amountPaise = Math.round(amountRupees * 100);

  const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });

  // Stamped onto the Razorpay order so the webhook — which arrives with no
  // tenant subdomain/host to resolve from — can identify which tenant this
  // payment belongs to. See src/app/api/webhooks/razorpay/route.ts.
  const tenantId = await getTenantId();

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      notes: {
        courseId,
        name: name || "",
        email: email || sessionUser?.email || "",
        tenantId,
      },
    });
  } catch {
    return { error: "Couldn't start checkout. Please try again." };
  }

  return { order: { orderId: order.id, amountPaise, keyId: creds.keyId } };
}

export type VerifyPaymentState = { error?: string; redirectTo?: string };

export async function verifyRazorpayPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<VerifyPaymentState> {
  const creds = await getRazorpayCredentials();
  if (!creds) {
    return { error: "Payment verification is unavailable." };
  }

  const expected = createHmac("sha256", creds.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(input.signature, "hex");
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return { error: "Payment could not be verified. If you were charged, contact support." };
  }

  const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });

  // Fetch authoritative order details from Razorpay's own API — never trust
  // client-supplied courseId/amount, even though the signature is now verified.
  let order;
  try {
    order = await razorpay.orders.fetch(input.orderId);
  } catch {
    return { error: "Couldn't confirm your payment. If you were charged, contact support." };
  }

  const notes = (order.notes ?? {}) as Record<string, string>;
  const courseId = notes.courseId;
  if (!courseId) {
    return { error: "Couldn't confirm which course this payment was for. Contact support." };
  }

  const supabase = await createClient();

  try {
    await finalizeRazorpayPayment({
      gatewayOrderId: input.orderId,
      gatewayPaymentId: input.paymentId,
      courseId,
      name: notes.name ?? "",
      email: notes.email ?? "",
      amountPaise: Number(order.amount),
      supabase,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Something went wrong finalizing your enrollment.",
    };
  }

  return { redirectTo: `/dashboard/courses/${courseId}` };
}

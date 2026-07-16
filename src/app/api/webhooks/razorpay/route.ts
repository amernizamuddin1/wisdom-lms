import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getRazorpayCredentials } from "@/lib/settings";
import { finalizeRazorpayPayment } from "@/lib/payments";
import { fulfillPaidOrder } from "@/lib/order-fulfillment";
import { platformPrisma, runWithTenant } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "wisdomquant";

export async function POST(request: NextRequest) {
  // Raw body required for HMAC verification — must be read before any .json() call
  // (the body stream can only be consumed once).
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "payment.captured") {
    // Acknowledge everything else without processing — 200 so Razorpay doesn't
    // retry events we intentionally ignore.
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const paymentEntity = event.payload?.payment?.entity;
  const gatewayOrderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;
  const amountPaise = paymentEntity?.amount;
  const notes = paymentEntity?.notes ?? {};

  if (!gatewayOrderId || !paymentId || !amountPaise) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // This request has no tenant subdomain/host to resolve from (Razorpay hits
  // whatever host the webhook is registered against), so the tenant is
  // identified from notes.tenantId, stamped on the order at creation time
  // (see razorpay-actions.ts / checkout/actions.ts). Orders created before
  // this stamping existed have no notes.tenantId — those fall back to the
  // single default tenant, which is exactly where they actually belong.
  const tenant = notes.tenantId
    ? await platformPrisma.tenant.findUnique({ where: { id: notes.tenantId } })
    : await platformPrisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } });

  if (!tenant) {
    console.error("Razorpay webhook: could not resolve a tenant for this payment", {
      gatewayOrderId,
      notesTenantId: notes.tenantId,
    });
    return NextResponse.json({ error: "Unknown tenant" }, { status: 400 });
  }

  return runWithTenant(tenant.id, tenant.slug, async () => {
    const creds = await getRazorpayCredentials();
    if (!creds) {
      // Not configured — nothing to verify against. Acknowledge with 200 so Razorpay
      // doesn't retry indefinitely for a deployment that hasn't set this up yet.
      console.error("Razorpay webhook received but credentials are not configured.", {
        tenantId: tenant.id,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const expected = createHmac("sha256", creds.webhookSecret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const providedBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      // Invalid signature — reject with 4xx, retrying will never succeed.
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
      // notes.orderId — the new cart/checkout flow (src/app/checkout/actions.ts).
      // notes.courseId — the pre-existing single-course flow, left unmodified so
      // any in-flight or historical payment created before this change still works.
      if (notes.orderId) {
        await fulfillPaidOrder({
          orderId: notes.orderId,
          gatewayOrderId,
          gatewayPaymentId: paymentId,
          gatewaySignature: request.headers.get("x-razorpay-signature") ?? "",
        });
      } else if (notes.courseId) {
        await finalizeRazorpayPayment({
          gatewayOrderId,
          gatewayPaymentId: paymentId,
          courseId: notes.courseId,
          name: notes.name ?? "",
          email: notes.email ?? "",
          amountPaise: Number(amountPaise),
          supabase: null, // webhook path — no browser session to attach, see src/lib/payments.ts
        });
      } else {
        return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
      }
      return NextResponse.json({ ok: true }, { status: 200 }); // includes the idempotent no-op case
    } catch (e) {
      console.error("Razorpay webhook finalize failed", e);
      // Genuine processing error — non-2xx so Razorpay retries per its retry policy.
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  });
}

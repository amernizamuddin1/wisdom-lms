"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranding } from "@/components/BrandingProvider";
import { createRazorpayOrder, verifyRazorpayPayment } from "./razorpay-actions";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

export default function RazorpayCheckoutButton({
  courseId,
  isLoggedIn,
  prefillName,
  prefillEmail,
}: {
  courseId: string;
  isLoggedIn: boolean;
  prefillName?: string;
  prefillEmail?: string;
}) {
  const router = useRouter();
  const { platformName } = useBranding();
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(prefillName ?? "");
  const [email, setEmail] = useState(prefillEmail ?? "");

  async function startCheckout() {
    setError(null);
    setStatus("creating");

    const fd = new FormData();
    fd.set("courseId", courseId);
    fd.set("name", name);
    fd.set("email", email);

    const result = await createRazorpayOrder({}, fd);
    if (result.error || !result.order) {
      setError(result.error ?? "Couldn't start checkout.");
      setStatus("idle");
      return;
    }

    setStatus("paying");

    const rzp = new window.Razorpay({
      key: result.order.keyId,
      order_id: result.order.orderId,
      amount: result.order.amountPaise,
      currency: "INR",
      name: platformName,
      prefill: { name, email },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setStatus("verifying");
        const verifyResult = await verifyRazorpayPayment({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
        if (verifyResult.error || !verifyResult.redirectTo) {
          setError(verifyResult.error ?? "Something went wrong confirming your payment.");
          setStatus("idle");
          return;
        }
        router.push(verifyResult.redirectTo);
      },
      modal: {
        // User closed the modal without paying — not a failure, just reset to idle.
        ondismiss: () => setStatus("idle"),
      },
      theme: { color: "#2563EB" },
    });

    rzp.on("payment.failed", () => {
      setError("Payment failed. Please try again.");
      setStatus("idle");
    });

    rzp.open();
  }

  const statusLabel: Record<typeof status, string> = {
    idle: "Enroll Now — Pay with Razorpay",
    creating: "Preparing checkout...",
    paying: "Waiting for payment...",
    verifying: "Confirming payment...",
  };

  return (
    <div className="space-y-3">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      {!isLoggedIn && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="rzp-name">Name</Label>
            <Input
              id="rzp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rzp-email">Email</Label>
            <Input
              id="rzp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        className="w-full"
        disabled={!scriptReady || status !== "idle" || (!isLoggedIn && (!name || !email))}
        onClick={startCheckout}
      >
        {statusLabel[status]}
      </Button>
    </div>
  );
}

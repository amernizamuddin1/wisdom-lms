"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/components/BrandingProvider";
import { confirmCheckout, verifyCheckoutPayment } from "./actions";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

export default function CheckoutPayButton({
  isFree,
  couponCode,
}: {
  isFree: boolean;
  couponCode?: string;
}) {
  const router = useRouter();
  const { platformName } = useBranding();
  // Deliberately not seeded from `isFree` — isFree can change after mount (a
  // coupon can push a paid order to free or vice versa), and the `!isFree &&`
  // guard in the disabled check below already makes scriptReady irrelevant
  // whenever the order is currently free, regardless of when that became true.
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setStatus("creating");

    const result = await confirmCheckout(couponCode);

    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      setStatus("idle");
      return;
    }

    if (result.redirectTo) {
      toast.success("Order confirmed");
      router.push(result.redirectTo);
      return;
    }

    if (!result.razorpayOrder) {
      const message = "Something went wrong starting checkout.";
      setError(message);
      toast.error(message);
      setStatus("idle");
      return;
    }

    if (typeof window.Razorpay !== "function") {
      const message = "Payment couldn't start — please reload the page and try again.";
      setError(message);
      toast.error(message);
      setStatus("idle");
      return;
    }

    setStatus("paying");
    const { gatewayOrderId, amountPaise, keyId } = result.razorpayOrder;

    const rzp = new window.Razorpay({
      key: keyId,
      order_id: gatewayOrderId,
      amount: amountPaise,
      currency: "INR",
      name: platformName,
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setStatus("verifying");
        const verifyResult = await verifyCheckoutPayment({
          gatewayOrderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
        if (verifyResult.error || !verifyResult.redirectTo) {
          const message = verifyResult.error ?? "Something went wrong confirming your payment.";
          setError(message);
          toast.error(message);
          setStatus("idle");
          return;
        }
        toast.success("Payment successful");
        router.push(verifyResult.redirectTo);
      },
      modal: {
        ondismiss: () => setStatus("idle"),
      },
      theme: { color: "#2563EB" },
    });

    rzp.on("payment.failed", () => {
      const message = "Payment failed. Please try again.";
      setError(message);
      toast.error(message);
      setStatus("idle");
    });

    rzp.open();
  }

  const statusLabel: Record<typeof status, string> = {
    idle: isFree ? "Complete Enrollment" : "Confirm & Pay",
    creating: "Preparing...",
    paying: "Waiting for payment...",
    verifying: "Confirming payment...",
  };

  return (
    <div className="space-y-3">
      {!isFree && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onLoad={() => {
            // The load event can fire even when the script body didn't execute
            // cleanly (e.g. blocked mid-stream by an extension/proxy) — only
            // trust it once window.Razorpay is actually the constructor we expect.
            if (typeof window.Razorpay === "function") {
              setScriptReady(true);
            } else {
              setScriptFailed(true);
            }
          }}
          onError={() => setScriptFailed(true)}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isFree && scriptFailed && !error && (
        <p className="text-sm text-destructive">
          Couldn&apos;t load the payment provider. Check your connection (or disable any ad
          blocker/privacy extension for this site) and reload the page.
        </p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={(!isFree && !scriptReady) || status !== "idle"}
        onClick={handleConfirm}
      >
        {statusLabel[status]}
      </Button>
    </div>
  );
}

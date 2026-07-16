"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/app/(public)/cart/actions";

type Target = { itemType: "COURSE"; courseId: string } | { itemType: "BUNDLE"; bundleId: string };

export default function AddToCartButtons({
  target,
  isLoggedIn,
  loginReturnPath,
}: {
  target: Target;
  isLoggedIn: boolean;
  loginReturnPath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function goToLogin() {
    router.push(`/login?next=${encodeURIComponent(loginReturnPath)}`);
  }

  function handleAddToCart() {
    if (!isLoggedIn) return goToLogin();
    startTransition(async () => {
      const result = await addToCartAction(target);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Added to cart");
      router.push("/cart");
    });
  }

  function handleBuyNow() {
    if (!isLoggedIn) return goToLogin();
    startTransition(async () => {
      const result = await addToCartAction(target);
      if (result.error && result.error !== "This is already in your cart.") {
        toast.error(result.error);
        return;
      }
      router.push("/checkout");
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" disabled={pending} onClick={handleBuyNow}>
        {pending ? "Please wait..." : "Buy Now"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={handleAddToCart}
      >
        Add to Cart
      </Button>
    </div>
  );
}

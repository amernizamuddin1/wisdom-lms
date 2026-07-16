import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getCartWithItems } from "@/lib/cart";
import { getBranding } from "@/lib/branding";
import { logCommerceEvent } from "@/lib/commerce-events";
import { Button } from "@/components/ui/button";
import CheckoutSummary from "./CheckoutSummary";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return { title: `Checkout | ${branding.platformName}` };
}

export default async function CheckoutPage() {
  const user = await requireUser();
  const cart = await getCartWithItems(user.id);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <Button asChild className="mt-6">
          <Link href="/courses">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  logCommerceEvent({ userId: user.id, type: "CHECKOUT_STARTED" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Checkout</h1>

      <div className="mb-6 rounded-xl border bg-card p-4">
        <h2 className="mb-1 text-sm font-medium text-muted-foreground">Billing to</h2>
        <p className="font-medium text-foreground">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <CheckoutSummary cart={cart} />
    </div>
  );
}

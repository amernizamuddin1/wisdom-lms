import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getCartWithItems } from "@/lib/cart";
import { getBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import CartList from "./CartList";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return { title: `Your Cart | ${branding.platformName}` };
}

export default async function CartPage() {
  const user = await requireUser();
  const cart = await getCartWithItems(user.id);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 font-body text-muted-foreground">
          Browse our courses and add something you&apos;d like to learn.
        </p>
        <Button asChild className="mt-6">
          <Link href="/courses">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  const symbol = cart.currency === "INR" ? "₹" : cart.currency === "EUR" ? "€" : "$";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Your Cart</h1>
      <CartList items={cart.items} currencySymbol={symbol} />

      <div className="mt-6 space-y-2 rounded-xl border bg-card p-4">
        <div className="flex justify-between font-body text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>
            {symbol}
            {cart.subtotal.toLocaleString()}
          </span>
        </div>
        {cart.discountTotal > 0 && (
          <div className="flex justify-between font-body text-sm text-muted-foreground">
            <span>Discount</span>
            <span>
              -{symbol}
              {cart.discountTotal.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 text-base font-semibold text-foreground">
          <span>Total</span>
          <span>
            {symbol}
            {cart.total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button asChild variant="outline">
          <Link href="/courses">Continue Browsing</Link>
        </Button>
        <Button asChild>
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  );
}

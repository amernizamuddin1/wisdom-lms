import { Suspense } from "react";
import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";
import { getOptionalUser } from "@/lib/auth";
import { getCartItemCount } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import {
  NotificationBellFallback,
  NotificationBellServer,
} from "@/components/NotificationBellServer";

export function PublicUserControlsFallback() {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/login">Log In</Link>
    </Button>
  );
}

export default async function PublicUserControls() {
  const user = await getOptionalUser();

  if (!user) {
    return <PublicUserControlsFallback />;
  }

  const cartItemCount = await getCartItemCount(user.id);

  return (
    <>
      <Suspense fallback={<NotificationBellFallback />}>
        <NotificationBellServer userId={user.id} />
      </Suspense>
      <Button asChild size="icon" variant="outline" className="relative">
        <Link
          href="/cart"
          aria-label={`Cart${cartItemCount > 0 ? ` (${cartItemCount} items)` : ""}`}
        >
          <ShoppingCartIcon className="size-4" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {cartItemCount > 9 ? "9+" : cartItemCount}
            </span>
          )}
        </Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/dashboard">My Dashboard</Link>
      </Button>
    </>
  );
}

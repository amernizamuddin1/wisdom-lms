"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addToCart, removeFromCart } from "@/lib/cart";
import { logCommerceEvent } from "@/lib/commerce-events";

export type CartActionState = { error?: string; success?: boolean };

export async function addToCartAction(
  target: { itemType: "COURSE"; courseId: string } | { itemType: "BUNDLE"; bundleId: string },
): Promise<CartActionState> {
  const user = await requireUser();
  const result = await addToCart(user.id, target);
  if (!result.ok) return { error: result.error };

  logCommerceEvent({
    userId: user.id,
    type: "ADDED_TO_CART",
    courseId: target.itemType === "COURSE" ? target.courseId : null,
    bundleId: target.itemType === "BUNDLE" ? target.bundleId : null,
  });

  revalidatePath("/cart");
  return { success: true };
}

export async function removeFromCartAction(cartItemId: string): Promise<CartActionState> {
  const user = await requireUser();
  await removeFromCart(user.id, cartItemId);
  revalidatePath("/cart");
  return { success: true };
}

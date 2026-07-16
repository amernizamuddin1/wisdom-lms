import "server-only";
import { prisma } from "@/lib/prisma";
import { effectivePrice, isDiscountActive, discountPercentage } from "@/lib/pricing";
import { selectDisplayPrice } from "@/app/(public)/PriceDisplay";
import { getTenantId } from "@/lib/tenant-context";

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  const tenantId = await getTenantId();
  return prisma.cart.create({ data: { tenantId, userId } });
}

export async function getCartItemCount(userId: string): Promise<number> {
  return prisma.cartItem.count({ where: { cart: { userId } } });
}

export interface CartItemView {
  id: string;
  itemType: "COURSE" | "BUNDLE";
  courseId: string | null;
  bundleId: string | null;
  title: string;
  thumbnailUrl: string | null;
  currency: string;
  originalPrice: number;
  discountedPrice: number | null;
  effectivePrice: number;
  discountPct: number;
}

export interface CartView {
  cartId: string;
  items: CartItemView[];
  subtotal: number;
  discountTotal: number;
  total: number;
  currency: string;
}

// Reads the user's cart with course/bundle data joined in, computing the same
// authoritative effectivePrice() used at order-creation and payment-verification
// time so what the user sees here always matches what they'll actually be charged.
export async function getCartWithItems(userId: string): Promise<CartView | null> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { addedAt: "asc" },
        include: {
          course: { include: { prices: true } },
          bundle: { include: { prices: true } },
        },
      },
    },
  });

  if (!cart) return null;

  const items: CartItemView[] = [];
  for (const item of cart.items) {
    if (item.itemType === "COURSE" && item.course) {
      const priceRow = selectDisplayPrice(item.course.prices);
      if (item.course.isFree || !priceRow) {
        items.push({
          id: item.id,
          itemType: "COURSE",
          courseId: item.courseId,
          bundleId: null,
          title: item.course.title,
          thumbnailUrl: item.course.thumbnailUrl,
          currency: priceRow?.currency ?? "INR",
          originalPrice: 0,
          discountedPrice: null,
          effectivePrice: 0,
          discountPct: 0,
        });
        continue;
      }
      const amount = Number(priceRow.amount);
      const discountedRaw = priceRow.discountedPrice != null ? Number(priceRow.discountedPrice) : null;
      const priceInput = {
        amount,
        discountedPrice: discountedRaw,
        discountStartAt: priceRow.discountStartAt,
        discountEndAt: priceRow.discountEndAt,
        maxDiscountedEnrollments: priceRow.maxDiscountedEnrollments,
        discountedEnrollmentsUsed: priceRow.discountedEnrollmentsUsed,
      };
      const active = isDiscountActive(priceInput);
      items.push({
        id: item.id,
        itemType: "COURSE",
        courseId: item.courseId,
        bundleId: null,
        title: item.course.title,
        thumbnailUrl: item.course.thumbnailUrl,
        currency: priceRow.currency,
        originalPrice: amount,
        discountedPrice: active ? discountedRaw : null,
        effectivePrice: effectivePrice(priceInput),
        discountPct: active && discountedRaw != null ? discountPercentage(amount, discountedRaw) : 0,
      });
    } else if (item.itemType === "BUNDLE" && item.bundle) {
      const priceRow = selectDisplayPrice(item.bundle.prices);
      if (item.bundle.isFree || !priceRow) {
        items.push({
          id: item.id,
          itemType: "BUNDLE",
          courseId: null,
          bundleId: item.bundleId,
          title: item.bundle.name,
          thumbnailUrl: item.bundle.thumbnailUrl,
          currency: priceRow?.currency ?? "INR",
          originalPrice: 0,
          discountedPrice: null,
          effectivePrice: 0,
          discountPct: 0,
        });
        continue;
      }
      const amount = Number(priceRow.amount);
      const discountedRaw = priceRow.discountedPrice != null ? Number(priceRow.discountedPrice) : null;
      const priceInput = {
        amount,
        discountedPrice: discountedRaw,
        discountStartAt: priceRow.discountStartAt,
        discountEndAt: priceRow.discountEndAt,
        maxDiscountedEnrollments: priceRow.maxDiscountedEnrollments,
        discountedEnrollmentsUsed: priceRow.discountedEnrollmentsUsed,
      };
      const active = isDiscountActive(priceInput);
      items.push({
        id: item.id,
        itemType: "BUNDLE",
        courseId: null,
        bundleId: item.bundleId,
        title: item.bundle.name,
        thumbnailUrl: item.bundle.thumbnailUrl,
        currency: priceRow.currency,
        originalPrice: amount,
        discountedPrice: active ? discountedRaw : null,
        effectivePrice: effectivePrice(priceInput),
        discountPct: active && discountedRaw != null ? discountPercentage(amount, discountedRaw) : 0,
      });
    }
  }

  const subtotal = items.reduce((sum, i) => sum + i.originalPrice, 0);
  const total = items.reduce((sum, i) => sum + i.effectivePrice, 0);
  const currency = items[0]?.currency ?? "INR";

  return { cartId: cart.id, items, subtotal, discountTotal: subtotal - total, total, currency };
}

export type AddToCartResult = { ok: true } | { ok: false; error: string };

export async function addToCart(
  userId: string,
  target: { itemType: "COURSE"; courseId: string } | { itemType: "BUNDLE"; bundleId: string },
): Promise<AddToCartResult> {
  if (target.itemType === "COURSE") {
    const alreadyOwned = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: target.courseId } },
    });
    if (alreadyOwned?.status === "ACTIVE") {
      return { ok: false, error: "You already have access to this course." };
    }
  } else {
    const alreadyOwned = await prisma.bundleEnrollment.findUnique({
      where: { userId_bundleId: { userId, bundleId: target.bundleId } },
    });
    if (alreadyOwned?.status === "ACTIVE") {
      return { ok: false, error: "You already have access to this bundle." };
    }
  }

  const cart = await getOrCreateCart(userId);

  const existing = await prisma.cartItem.findFirst({
    where:
      target.itemType === "COURSE"
        ? { cartId: cart.id, itemType: "COURSE", courseId: target.courseId }
        : { cartId: cart.id, itemType: "BUNDLE", bundleId: target.bundleId },
  });
  if (existing) {
    return { ok: false, error: "This is already in your cart." };
  }

  const tenantId = await getTenantId();
  await prisma.cartItem.create({
    data:
      target.itemType === "COURSE"
        ? { tenantId, cartId: cart.id, itemType: "COURSE", courseId: target.courseId }
        : { tenantId, cartId: cart.id, itemType: "BUNDLE", bundleId: target.bundleId },
  });

  return { ok: true };
}

export async function removeFromCart(userId: string, cartItemId: string): Promise<void> {
  await prisma.cartItem.deleteMany({
    where: { id: cartItemId, cart: { userId } },
  });
}

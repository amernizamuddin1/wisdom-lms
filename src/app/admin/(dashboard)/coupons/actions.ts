"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { parseDecimal, parseDate } from "@/lib/form-parsing";
import { Prisma, type CouponType, type CouponScope } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };

function normalizeCode(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toUpperCase();
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

interface ParsedCouponFields {
  code: string;
  description: string | null;
  type: CouponType;
  value: string;
  maxDiscountAmount: string | null;
  minOrderAmount: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number | null;
  isActive: boolean;
  scope: CouponScope;
}

function parseCouponFields(formData: FormData): ParsedCouponFields | { error: string } {
  const code = normalizeCode(formData.get("code"));
  const description = String(formData.get("description") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "PERCENTAGE") as CouponType;
  const value = parseDecimal(formData.get("value"));
  const scope = String(formData.get("scope") ?? "ALL") as CouponScope;

  if (!code) return { error: "Coupon code is required." };
  if (!value) return { error: "Enter a valid discount value." };
  if (type === "PERCENTAGE" && Number(value) > 100) {
    return { error: "A percentage discount can't exceed 100." };
  }

  const validFrom = parseDate(formData.get("validFrom"));
  const validUntil = parseDate(formData.get("validUntil"));
  if (validFrom && validUntil && validFrom > validUntil) {
    return { error: "Valid-from date must be before the valid-until date." };
  }

  return {
    code,
    description,
    type,
    value,
    maxDiscountAmount: type === "PERCENTAGE" ? parseDecimal(formData.get("maxDiscountAmount")) : null,
    minOrderAmount: parseDecimal(formData.get("minOrderAmount")),
    validFrom,
    validUntil,
    maxRedemptions: parseOptionalInt(formData.get("maxRedemptions")),
    maxRedemptionsPerUser: parseOptionalInt(formData.get("maxRedemptionsPerUser")),
    isActive: formData.get("isActive") === "on",
    scope,
  };
}

export async function createCoupon(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const parsed = parseCouponFields(formData);
  if ("error" in parsed) return parsed;

  let coupon;
  try {
    coupon = await prisma.coupon.create({
      data: { ...parsed, createdById: admin.id, tenantId },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `The code "${parsed.code}" is already in use.` };
    }
    throw e;
  }

  redirect(`/admin/coupons/${coupon.id}`);
}

export async function updateCoupon(
  couponId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseCouponFields(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.coupon.update({ where: { id: couponId }, data: parsed });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `The code "${parsed.code}" is already in use.` };
    }
    throw e;
  }

  revalidatePath(`/admin/coupons/${couponId}`);
  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function setCouponActive(couponId: string, isActive: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.coupon.update({ where: { id: couponId }, data: { isActive } });
  revalidatePath(`/admin/coupons/${couponId}`);
  revalidatePath("/admin/coupons");
  return {};
}

export async function deleteCoupon(couponId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (coupon && coupon.redemptionsUsed > 0) {
    return {
      error: `This coupon has been redeemed ${coupon.redemptionsUsed} time${coupon.redemptionsUsed === 1 ? "" : "s"}. Deactivate it instead of deleting, so the order history stays intact.`,
    };
  }

  await prisma.coupon.delete({ where: { id: couponId } });
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function addCourseToCoupon(couponId: string, courseId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const existing = await prisma.couponCourse.findUnique({
    where: { couponId_courseId: { couponId, courseId } },
  });
  if (existing) return { error: "This course is already attached to the coupon." };

  await prisma.couponCourse.create({ data: { couponId, courseId, tenantId } });
  revalidatePath(`/admin/coupons/${couponId}`);
  return {};
}

export async function removeCourseFromCoupon(couponId: string, courseId: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.couponCourse.delete({ where: { couponId_courseId: { couponId, courseId } } });
  revalidatePath(`/admin/coupons/${couponId}`);
  return {};
}

export async function addBundleToCoupon(couponId: string, bundleId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const existing = await prisma.couponBundle.findUnique({
    where: { couponId_bundleId: { couponId, bundleId } },
  });
  if (existing) return { error: "This bundle is already attached to the coupon." };

  await prisma.couponBundle.create({ data: { couponId, bundleId, tenantId } });
  revalidatePath(`/admin/coupons/${couponId}`);
  return {};
}

export async function removeBundleFromCoupon(couponId: string, bundleId: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.couponBundle.delete({ where: { couponId_bundleId: { couponId, bundleId } } });
  revalidatePath(`/admin/coupons/${couponId}`);
  return {};
}

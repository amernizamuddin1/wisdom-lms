"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDecimal, splitCommaList, parseDate, parseDiscountFields } from "@/lib/form-parsing";
import type { DurationChoice } from "@/lib/access";
import { grantBundleAccess, backfillNewBundleCourse } from "@/lib/bundle-access";
import { Prisma } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMetadataFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "")),
    shortDescription: String(formData.get("shortDescription") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    tags: splitCommaList(formData.get("tags")),
    launchDate: parseDate(formData.get("launchDate")),
  };
}

export async function createBundle(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const meta = parseMetadataFields(formData);
  const isFree = formData.get("isFree") === "on";

  if (!meta.name) return { error: "Bundle name is required." };
  if (!meta.slug) return { error: "Bundle slug is required." };

  const existingSlug = await prisma.courseBundle.findUnique({ where: { slug: meta.slug } });
  if (existingSlug) return { error: `The slug "${meta.slug}" is already in use.` };

  const priceInr = parseDecimal(formData.get("priceInr"));
  const priceUsd = parseDecimal(formData.get("priceUsd"));
  const priceEur = parseDecimal(formData.get("priceEur"));

  if (!isFree && (!priceInr || !priceUsd)) {
    return { error: "INR and USD prices are required for a paid bundle." };
  }

  let bundle;
  try {
    bundle = await prisma.courseBundle.create({
      data: {
        ...meta,
        isFree,
        createdById: admin.id,
        tenantId,
        prices: isFree
          ? undefined
          : {
              create: [
                { currency: "INR", amount: priceInr!, tenantId },
                { currency: "USD", amount: priceUsd!, tenantId },
                ...(priceEur ? [{ currency: "EUR" as const, amount: priceEur, tenantId }] : []),
              ],
            },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `The slug "${meta.slug}" is already in use.` };
    }
    throw e;
  }

  redirect(`/admin/bundles/${bundle.id}`);
}

export async function updateBundleDetails(
  bundleId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const meta = parseMetadataFields(formData);
  const isFree = formData.get("isFree") === "on";

  if (!meta.name) return { error: "Bundle name is required." };
  if (!meta.slug) return { error: "Bundle slug is required." };

  const existingSlug = await prisma.courseBundle.findUnique({ where: { slug: meta.slug } });
  if (existingSlug && existingSlug.id !== bundleId) {
    return { error: `The slug "${meta.slug}" is already in use.` };
  }

  try {
    await prisma.courseBundle.update({
      where: { id: bundleId },
      data: { ...meta, isFree },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `The slug "${meta.slug}" is already in use.` };
    }
    throw e;
  }

  revalidatePath(`/admin/bundles/${bundleId}`);
  revalidatePath("/admin/bundles");
  return { success: true };
}

export async function upsertBundlePrices(
  bundleId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const priceInr = parseDecimal(formData.get("priceInr"));
  const priceUsd = parseDecimal(formData.get("priceUsd"));
  const priceEur = parseDecimal(formData.get("priceEur"));

  if (!priceInr || !priceUsd) {
    return { error: "INR and USD prices are required." };
  }

  const discountInr = parseDiscountFields(formData, "Inr", priceInr);
  if ("error" in discountInr) return discountInr;
  const discountUsd = parseDiscountFields(formData, "Usd", priceUsd);
  if ("error" in discountUsd) return discountUsd;
  const discountEur = priceEur ? parseDiscountFields(formData, "Eur", priceEur) : null;
  if (discountEur && "error" in discountEur) return discountEur;

  await prisma.$transaction([
    prisma.bundlePrice.upsert({
      where: { bundleId_currency: { bundleId, currency: "INR" } },
      create: { bundleId, currency: "INR", amount: priceInr, ...discountInr, tenantId },
      update: { amount: priceInr, ...discountInr },
    }),
    prisma.bundlePrice.upsert({
      where: { bundleId_currency: { bundleId, currency: "USD" } },
      create: { bundleId, currency: "USD", amount: priceUsd, ...discountUsd, tenantId },
      update: { amount: priceUsd, ...discountUsd },
    }),
  ]);

  if (priceEur && discountEur) {
    await prisma.bundlePrice.upsert({
      where: { bundleId_currency: { bundleId, currency: "EUR" } },
      create: { bundleId, currency: "EUR", amount: priceEur, ...discountEur, tenantId },
      update: { amount: priceEur, ...discountEur },
    });
  } else {
    await prisma.bundlePrice.deleteMany({ where: { bundleId, currency: "EUR" } });
  }

  revalidatePath(`/admin/bundles/${bundleId}`);
  return { success: true };
}

export async function updateBundleAccessPolicy(
  bundleId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const durationChoice = String(formData.get("duration") ?? "") as DurationChoice | "";
  if (!durationChoice) return { error: "Select an access duration." };

  if (durationChoice === "forever") {
    await prisma.courseBundle.update({
      where: { id: bundleId },
      data: { isPermanentAccess: true, accessDurationMonths: null },
    });
  } else if (durationChoice === "custom") {
    const months = Number(formData.get("customMonths"));
    if (!Number.isFinite(months) || months <= 0) {
      return { error: "Enter a custom duration in months greater than zero." };
    }
    await prisma.courseBundle.update({
      where: { id: bundleId },
      data: { isPermanentAccess: false, accessDurationMonths: Math.round(months) },
    });
  } else {
    const months = Number(durationChoice);
    await prisma.courseBundle.update({
      where: { id: bundleId },
      data: { isPermanentAccess: false, accessDurationMonths: months },
    });
  }

  revalidatePath(`/admin/bundles/${bundleId}`);
  return { success: true };
}

export async function setBundleStatus(
  bundleId: string,
  status: "DRAFT" | "ACTIVE" | "PAUSED",
): Promise<{ error?: string }> {
  await requireAdmin();

  if (status === "ACTIVE") {
    const courseCount = await prisma.bundleCourse.count({ where: { bundleId } });
    if (courseCount < 2) {
      return { error: "A bundle needs at least 2 courses before it can be activated." };
    }
  }

  await prisma.courseBundle.update({ where: { id: bundleId }, data: { status } });
  revalidatePath(`/admin/bundles/${bundleId}`);
  revalidatePath("/admin/bundles");
  return {};
}

export async function deleteBundle(bundleId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const enrollmentCount = await prisma.bundleEnrollment.count({ where: { bundleId } });
  if (enrollmentCount > 0) {
    return {
      error: `This bundle has ${enrollmentCount} learner ${enrollmentCount === 1 ? "entitlement" : "entitlements"}. Pause it instead of deleting, so existing access isn't affected.`,
    };
  }

  await prisma.courseBundle.delete({ where: { id: bundleId } });
  revalidatePath("/admin/bundles");
  redirect("/admin/bundles");
}

export async function addCourseToBundle(
  bundleId: string,
  courseId: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const existing = await prisma.bundleCourse.findUnique({
    where: { bundleId_courseId: { bundleId, courseId } },
  });
  if (existing) return { error: "This course is already in the bundle." };

  const maxOrder = await prisma.bundleCourse.aggregate({
    where: { bundleId },
    _max: { order: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.bundleCourse.create({
      data: { bundleId, courseId, order: (maxOrder._max.order ?? -1) + 1, tenantId },
    });
    await backfillNewBundleCourse(tx, { bundleId, courseId });
  });

  revalidatePath(`/admin/bundles/${bundleId}`);
  return {};
}

export async function removeCourseFromBundle(
  bundleId: string,
  courseId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const courseCount = await prisma.bundleCourse.count({ where: { bundleId } });
  const bundle = await prisma.courseBundle.findUnique({ where: { id: bundleId } });

  if (courseCount <= 2 && bundle?.status === "ACTIVE") {
    return { error: "An active bundle must keep at least 2 courses. Pause it first if you need to go lower." };
  }

  // Only removes the bundle-course link. Learners who already received access
  // to this course through this bundle keep it — access is never silently
  // revoked when a bundle's composition changes after purchase.
  await prisma.bundleCourse.delete({
    where: { bundleId_courseId: { bundleId, courseId } },
  });

  revalidatePath(`/admin/bundles/${bundleId}`);
  return {};
}

export type AssignBundleState = { error?: string; success?: boolean };

export async function assignBundleToLearner(
  bundleId: string,
  _prevState: AssignBundleState,
  formData: FormData,
): Promise<AssignBundleState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const startDateInput = parseDate(formData.get("accessStartAt"));

  if (!email) return { error: "Learner email is required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: `No user found with the email "${email}". They need an account before you can assign them a bundle.` };
  }

  const courseCount = await prisma.bundleCourse.count({ where: { bundleId } });
  if (courseCount < 2) {
    return { error: "This bundle needs at least 2 courses before it can be assigned." };
  }

  const startAt = startDateInput ?? new Date();

  await prisma.$transaction(async (tx) => {
    await grantBundleAccess(tx, { userId: user.id, bundleId, startAt });
  });

  revalidatePath(`/admin/bundles/${bundleId}`);
  return { success: true };
}

export async function uploadBundleThumbnail(
  bundleId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const file = formData.get("thumbnail");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `bundles/${bundleId}/thumbnail-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("course-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from("course-assets").getPublicUrl(path);

  await prisma.courseBundle.update({
    where: { id: bundleId },
    data: { thumbnailUrl: data.publicUrl },
  });

  revalidatePath(`/admin/bundles/${bundleId}`);
  return { success: true };
}

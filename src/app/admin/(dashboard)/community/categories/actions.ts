"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { Prisma, type CommunityVisibilityType, type CommunityPostingPermission } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const displayOrder = Number(formData.get("displayOrder") ?? 0) || 0;
  const isActive = formData.get("isActive") === "on";
  const visibilityType = String(formData.get("visibilityType") ?? "PUBLIC") as CommunityVisibilityType;
  const postingPermission = String(formData.get("postingPermission") ?? "ANYONE") as CommunityPostingPermission;

  if (!name) return { error: "Name is required." };
  const slug = slugify(slugInput || name);
  if (!slug) return { error: "Slug could not be generated — enter a valid name or slug." };

  return { name, slug, description, displayOrder, isActive, visibilityType, postingPermission };
}

export async function createCategory(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();
  const parsed = parseFields(formData);
  if ("error" in parsed) return parsed;

  let category;
  try {
    category = await prisma.communityCategory.create({
      data: { ...parsed, createdById: admin.id, tenantId },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `The slug "${parsed.slug}" is already in use.` };
    }
    throw e;
  }

  revalidatePath("/admin/community/categories");
  redirect(`/admin/community/categories/${category.id}`);
}

export async function updateCategory(
  categoryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseFields(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.communityCategory.update({ where: { id: categoryId }, data: parsed });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `The slug "${parsed.slug}" is already in use.` };
    }
    throw e;
  }

  revalidatePath(`/admin/community/categories/${categoryId}`);
  revalidatePath("/admin/community/categories");
  return { success: true };
}

export async function setCategoryActive(categoryId: string, isActive: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.communityCategory.update({ where: { id: categoryId }, data: { isActive } });
  revalidatePath(`/admin/community/categories/${categoryId}`);
  revalidatePath("/admin/community/categories");
  return {};
}

export async function deleteCategory(categoryId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const threadCount = await prisma.discussionThread.count({ where: { categoryId } });
  if (threadCount > 0) {
    return {
      error: `This category has ${threadCount} thread${threadCount === 1 ? "" : "s"}. Deactivate it instead of deleting.`,
    };
  }

  await prisma.communityCategory.delete({ where: { id: categoryId } });
  revalidatePath("/admin/community/categories");
  redirect("/admin/community/categories");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Institution creation is admin-only (never delegated to a GROUP_ADMIN) —
// see the "Group creation" decision in the plan this feature was built from.
export async function createGroup(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);

  if (!name) return { error: "Institution name is required." };
  if (!slug) return { error: "Institution slug is required." };

  let group;
  try {
    group = await prisma.group.create({ data: { tenantId, name, slug } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `The slug "${slug}" is already in use by another institution.` };
    }
    throw e;
  }

  revalidatePath("/admin/groups");
  redirect(`/admin/groups/${group.id}`);
}

export async function archiveGroup(groupId: string): Promise<{ error?: string }> {
  await requireAdmin();

  await prisma.group.update({ where: { id: groupId }, data: { status: "ARCHIVED" } });
  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  return {};
}

export async function reactivateGroup(groupId: string): Promise<{ error?: string }> {
  await requireAdmin();

  await prisma.group.update({ where: { id: groupId }, data: { status: "ACTIVE" } });
  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { invalidatePublicCourseCache } from "@/lib/public-cache";

export type ActionState = { error?: string; success?: boolean };

function parseInstructorFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  return { name, title, bio, avatarUrl };
}

export async function createInstructor(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();
  const { name, title, bio, avatarUrl } = parseInstructorFields(formData);

  if (!name) {
    return { error: "Name is required." };
  }

  await prisma.instructor.create({
    data: {
      name,
      title: title || null,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
      tenantId,
    },
  });

  revalidatePath("/admin/instructors");
  return { success: true };
}

export async function updateInstructor(
  instructorId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const { name, title, bio, avatarUrl } = parseInstructorFields(formData);

  if (!name) {
    return { error: "Name is required." };
  }

  await prisma.instructor.update({
    where: { id: instructorId },
    data: {
      name,
      title: title || null,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
    },
  });

  await invalidatePublicCourseCache();
  revalidatePath("/admin/instructors");
  revalidatePath("/admin/courses");
  return { success: true };
}

export async function deleteInstructor(instructorId: string): Promise<ActionState> {
  await requireAdmin();
  await prisma.instructor.delete({ where: { id: instructorId } });
  await invalidatePublicCourseCache();
  revalidatePath("/admin/instructors");
  revalidatePath("/admin/courses");
  return { success: true };
}

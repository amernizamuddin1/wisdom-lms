"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import type { CommunitySortOrder } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export async function saveCommunitySettings(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const maxImageSizeMb = Number(formData.get("maxImageSizeMb") ?? 5);
  if (!Number.isFinite(maxImageSizeMb) || maxImageSizeMb <= 0) {
    return { error: "Max image size must be a positive number." };
  }

  const allowedImageFormats = String(formData.get("allowedImageFormats") ?? "")
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);
  if (allowedImageFormats.length === 0) {
    return { error: "Enter at least one allowed image format." };
  }

  const data = {
    communityEnabled: bool(formData, "communityEnabled"),
    courseDiscussionsEnabled: bool(formData, "courseDiscussionsEnabled"),
    allowGlobalDiscussionCreation: bool(formData, "allowGlobalDiscussionCreation"),
    allowCourseQuestions: bool(formData, "allowCourseQuestions"),
    allowLikes: bool(formData, "allowLikes"),
    allowReporting: bool(formData, "allowReporting"),
    allowImageUploads: bool(formData, "allowImageUploads"),
    maxImageSizeMb: Math.round(maxImageSizeMb),
    allowedImageFormats,
    allowPostEditing: bool(formData, "allowPostEditing"),
    allowAnswerEditing: bool(formData, "allowAnswerEditing"),
    allowReplyEditing: bool(formData, "allowReplyEditing"),
    autoFollowOnParticipation: bool(formData, "autoFollowOnParticipation"),
    defaultSortOrder: String(formData.get("defaultSortOrder") ?? "LATEST") as CommunitySortOrder,
  };

  await prisma.communitySettings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });

  revalidatePath("/admin/community/settings");
  return { success: true };
}

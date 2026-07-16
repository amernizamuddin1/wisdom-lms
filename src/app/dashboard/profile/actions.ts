"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordProfileCompleted } from "@/lib/gamification/events";

export type ActionState = { error?: string; success?: boolean };

// "Complete profile" = name (always present) + phone + a profile photo, all
// filled in. Checked after either save action changes one of those fields;
// recordProfileCompleted is dedupe-safe so this only ever awards XP once.
async function checkAndRecordProfileCompletion(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.name && user.phone && user.profilePhotoUrl) {
    await prisma.$transaction((tx) => recordProfileCompleted(tx, userId));
  }
}

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) return { error: "Name is required." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone: phone || null },
  });
  await checkAndRecordProfileCompletion(user.id);

  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function uploadProfilePhoto(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `avatars/${user.id}/photo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("course-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from("course-assets").getPublicUrl(path);

  await prisma.user.update({
    where: { id: user.id },
    data: { profilePhotoUrl: data.publicUrl },
  });
  await checkAndRecordProfileCompletion(user.id);

  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function changePassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

"use server";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommunitySettings } from "@/lib/community/access";

export type UploadImageState = { error?: string; url?: string };

// Mirrors uploadCommunicationImage (src/app/admin/(dashboard)/communications/emails/actions.ts)
// but is gated for any signed-in user (not just admins) and respects the
// community-wide allowImageUploads toggle.
export async function uploadDiscussionImage(
  _prevState: UploadImageState,
  formData: FormData,
): Promise<UploadImageState> {
  await requireUser();

  const settings = await getCommunitySettings();
  if (!settings.allowImageUploads) {
    return { error: "Image uploads are currently disabled for the community." };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only image files are allowed." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image must be under 5MB." };
  }

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `discussions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("course-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
  return { url: data.publicUrl };
}

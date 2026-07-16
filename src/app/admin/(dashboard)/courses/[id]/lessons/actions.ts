"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectVideoSource } from "@/lib/video";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { touchCourseUpdatedAt } from "@/lib/course-content";
import { LessonType } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };
export type UploadFileState = { error?: string; file?: { id: string; fileName: string } };
export type UploadAudioState = { error?: string; path?: string; previewUrl?: string };

const LESSON_TYPES = Object.values(LessonType);

export async function createLesson(courseId: string, chapterId: string, title: string) {
  await requireAdmin();
  const tenantId = await getTenantId();

  if (!title.trim()) {
    throw new Error("Lesson title is required.");
  }

  const last = await prisma.lesson.findFirst({
    where: { chapterId },
    orderBy: { order: "desc" },
  });

  const lesson = await prisma.lesson.create({
    data: { chapterId, title: title.trim(), order: (last?.order ?? -1) + 1, tenantId },
  });

  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  return lesson;
}

export async function updateLesson(
  courseId: string,
  chapterId: string,
  lessonId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const lessonTypeRaw = String(formData.get("lessonType") ?? "VIDEO").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const captionUrl = String(formData.get("captionUrl") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const textContentRaw = String(formData.get("textContent") ?? "").trim();

  if (!title) {
    return { error: "Title is required." };
  }

  if (!LESSON_TYPES.includes(lessonTypeRaw as LessonType)) {
    return { error: "Invalid lesson type." };
  }
  const lessonType = lessonTypeRaw as LessonType;

  await prisma.lesson.update({
    where: { id: lessonId, chapterId },
    data: {
      title,
      lessonType,
      videoUrl: lessonType !== "TEXT" && videoUrl ? videoUrl : null,
      videoSourceType: lessonType === "VIDEO" && videoUrl ? detectVideoSource(videoUrl) : null,
      captionUrl: lessonType === "VIDEO" && captionUrl ? captionUrl : null,
      textContent: lessonType === "TEXT" && textContentRaw ? sanitizeLessonHtml(textContentRaw) : null,
      instructions: instructions || null,
    },
  });

  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  return { success: true };
}

export async function deleteLesson(courseId: string, chapterId: string, lessonId: string) {
  await requireAdmin();
  await prisma.lesson.delete({ where: { id: lessonId, chapterId } });
  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function uploadLessonFile(
  courseId: string,
  lessonId: string,
  _prevState: UploadFileState,
  formData: FormData,
): Promise<UploadFileState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file." };
  }

  const supabase = createAdminClient();
  const path = `${lessonId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("lesson-files")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const created = await prisma.lessonFile.create({
    data: { lessonId, fileUrl: path, fileName: file.name, tenantId },
  });

  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  return { file: { id: created.id, fileName: created.fileName } };
}

export async function uploadLessonAudio(
  courseId: string,
  lessonId: string,
  _prevState: UploadAudioState,
  formData: FormData,
): Promise<UploadAudioState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an audio file." };
  }

  const supabase = createAdminClient();
  const path = `${lessonId}/audio-${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("lesson-files")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data } = await supabase.storage.from("lesson-files").createSignedUrl(path, 600);

  return { path, previewUrl: data?.signedUrl };
}

export async function deleteLessonFile(courseId: string, lessonId: string, fileId: string) {
  await requireAdmin();

  const file = await prisma.lessonFile.findUnique({ where: { id: fileId, lessonId } });
  if (!file) return;

  const supabase = createAdminClient();
  await supabase.storage.from("lesson-files").remove([file.fileUrl]);

  await prisma.lessonFile.delete({ where: { id: fileId } });

  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
}

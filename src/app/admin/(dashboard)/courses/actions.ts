"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { COURSE_ASSETS_BUCKET, buildCourseThumbnailPath, describeStorageError, validateUpload } from "@/lib/storage/paths";
import { touchCourseUpdatedAt } from "@/lib/course-content";
import {
  parseDecimal,
  splitCommaList,
  parseDate,
  parseDiscountFields,
  getAllNonEmpty,
} from "@/lib/form-parsing";
import { detectVideoSource } from "@/lib/video";
import type { CourseLevel } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };

function parseBasicFields(formData: FormData) {
  return {
    tags: splitCommaList(formData.get("tags")),
  };
}

export async function createCourse(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const title = String(formData.get("title") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isFree = formData.get("isFree") === "on";

  if (!title) {
    return { error: "Title is required." };
  }

  const priceInr = parseDecimal(formData.get("priceInr"));
  const priceUsd = parseDecimal(formData.get("priceUsd"));
  const priceEur = parseDecimal(formData.get("priceEur"));

  if (!isFree && (!priceInr || !priceUsd)) {
    return { error: "INR and USD prices are required for a paid course." };
  }

  const basic = parseBasicFields(formData);

  const course = await prisma.course.create({
    data: {
      title,
      shortDescription: shortDescription || null,
      description: description || null,
      isFree,
      createdById: admin.id,
      tenantId,
      ...basic,
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

  redirect(`/admin/courses/${course.id}`);
}

export async function updateCourseDetails(
  courseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isFree = formData.get("isFree") === "on";

  if (!title) {
    return { error: "Title is required." };
  }

  const basic = parseBasicFields(formData);

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title,
      shortDescription: shortDescription || null,
      description: description || null,
      isFree,
      ...basic,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function updateCourseLearningDetails(
  courseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  await prisma.course.update({
    where: { id: courseId },
    data: {
      prerequisites: getAllNonEmpty(formData, "prerequisites"),
      learningObjectives: getAllNonEmpty(formData, "learningObjectives"),
      outcomes: getAllNonEmpty(formData, "outcomes"),
      materialsIncluded: getAllNonEmpty(formData, "materialsIncluded"),
      targetAudience: getAllNonEmpty(formData, "targetAudience"),
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function updateCourseLaunchDate(
  courseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  await prisma.course.update({
    where: { id: courseId },
    data: { launchDate: parseDate(formData.get("launchDate")) },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function updateCoursePreviewVideo(
  courseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const previewVideoUrl = String(formData.get("previewVideoUrl") ?? "").trim();

  await prisma.course.update({
    where: { id: courseId },
    data: {
      previewVideoUrl: previewVideoUrl || null,
      previewVideoSourceType: previewVideoUrl ? detectVideoSource(previewVideoUrl) : null,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function updateCourseMeta(
  courseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const levelRaw = String(formData.get("level") ?? "");
  const level = (levelRaw || null) as CourseLevel | null;

  const hours = Number(formData.get("durationHours") ?? 0) || 0;
  const minutes = Number(formData.get("durationMinutesPart") ?? 0) || 0;
  const totalMinutes = hours * 60 + minutes;

  const certificateEnabled = formData.get("certificateEnabled") === "on";

  const durationChoice = String(formData.get("accessDuration") ?? "forever");
  let isPermanentAccess = true;
  let accessDurationMonths: number | null = null;

  if (durationChoice === "custom") {
    const months = Number(formData.get("customAccessMonths"));
    if (!Number.isFinite(months) || months <= 0) {
      return { error: "Enter a custom access duration in months greater than zero." };
    }
    isPermanentAccess = false;
    accessDurationMonths = Math.round(months);
  } else if (durationChoice !== "forever") {
    accessDurationMonths = Number(durationChoice);
    isPermanentAccess = false;
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      level,
      durationMinutes: totalMinutes > 0 ? totalMinutes : null,
      certificateEnabled,
      isPermanentAccess,
      accessDurationMonths,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function assignCourseInstructors(
  courseId: string,
  instructorIds: string[],
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  await prisma.$transaction([
    prisma.courseInstructor.deleteMany({ where: { courseId } }),
    prisma.courseInstructor.createMany({
      data: instructorIds.map((instructorId, order) => ({ courseId, instructorId, order, tenantId })),
    }),
  ]);

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function upsertCoursePrices(
  courseId: string,
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
    prisma.coursePrice.upsert({
      where: { courseId_currency: { courseId, currency: "INR" } },
      create: { courseId, currency: "INR", amount: priceInr, ...discountInr, tenantId },
      update: { amount: priceInr, ...discountInr },
    }),
    prisma.coursePrice.upsert({
      where: { courseId_currency: { courseId, currency: "USD" } },
      create: { courseId, currency: "USD", amount: priceUsd, ...discountUsd, tenantId },
      update: { amount: priceUsd, ...discountUsd },
    }),
  ]);

  if (priceEur && discountEur) {
    await prisma.coursePrice.upsert({
      where: { courseId_currency: { courseId, currency: "EUR" } },
      create: { courseId, currency: "EUR", amount: priceEur, ...discountEur, tenantId },
      update: { amount: priceEur, ...discountEur },
    });
  } else {
    await prisma.coursePrice.deleteMany({ where: { courseId, currency: "EUR" } });
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

export async function setCourseLearningStatus(courseId: string, learningStatus: "ACTIVE" | "PAUSED") {
  await requireAdmin();
  await prisma.course.update({ where: { id: courseId }, data: { learningStatus } });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
}

export async function setCourseStatus(courseId: string, status: "DRAFT" | "PUBLISHED") {
  await requireAdmin();
  await prisma.course.update({ where: { id: courseId }, data: { status } });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
}

export async function duplicateCourse(courseId: string) {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      prices: true,
      instructors: true,
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" }, include: { files: true } },
          quizzes: { include: { questions: { orderBy: { order: "asc" } } } },
        },
      },
      quizzes: {
        where: { chapterId: null },
        include: { questions: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!course) throw new Error("Course not found.");

  const newCourse = await prisma.course.create({
    data: {
      title: `${course.title} (Copy)`,
      shortDescription: course.shortDescription,
      description: course.description,
      isFree: course.isFree,
      thumbnailUrl: course.thumbnailUrl,
      previewVideoUrl: course.previewVideoUrl,
      previewVideoSourceType: course.previewVideoSourceType,
      status: "DRAFT",
      level: course.level,
      tags: course.tags,
      prerequisites: course.prerequisites,
      learningObjectives: course.learningObjectives,
      outcomes: course.outcomes,
      targetAudience: course.targetAudience,
      materialsIncluded: course.materialsIncluded,
      durationMinutes: course.durationMinutes,
      certificateEnabled: course.certificateEnabled,
      isPermanentAccess: course.isPermanentAccess,
      accessDurationMonths: course.accessDurationMonths,
      launchDate: course.launchDate,
      createdById: admin.id,
      tenantId,
      instructors: {
        create: course.instructors.map((ci) => ({
          instructorId: ci.instructorId,
          order: ci.order,
          tenantId,
        })),
      },
      prices: {
        create: course.prices.map((p) => ({
          currency: p.currency,
          amount: p.amount,
          discountedPrice: p.discountedPrice,
          discountStartAt: p.discountStartAt,
          discountEndAt: p.discountEndAt,
          maxDiscountedEnrollments: p.maxDiscountedEnrollments,
          tenantId,
        })),
      },
      quizzes: {
        create: course.quizzes.map((q) => ({
          title: q.title,
          passPercentage: q.passPercentage,
          timeLimitMinutes: q.timeLimitMinutes,
          tenantId,
          questions: {
            create: q.questions.map((question) => ({
              questionText: question.questionText,
              questionType: question.questionType,
              optionsJson: question.optionsJson ?? undefined,
              correctOptionsJson: question.correctOptionsJson ?? undefined,
              correctAnswerText: question.correctAnswerText,
              explanation: question.explanation,
              order: question.order,
              tenantId,
            })),
          },
        })),
      },
      chapters: {
        create: course.chapters.map((chapter) => ({
          title: chapter.title,
          order: chapter.order,
          tenantId,
          lessons: {
            create: chapter.lessons.map((lesson) => ({
              title: lesson.title,
              lessonType: lesson.lessonType,
              videoUrl: lesson.videoUrl,
              videoSourceType: lesson.videoSourceType,
              captionUrl: lesson.captionUrl,
              textContent: lesson.textContent,
              instructions: lesson.instructions,
              order: lesson.order,
              tenantId,
              files: {
                create: lesson.files.map((file) => ({
                  fileUrl: file.fileUrl,
                  fileName: file.fileName,
                  tenantId,
                })),
              },
            })),
          },
          quizzes: {
            create: chapter.quizzes.map((q) => ({
              title: q.title,
              passPercentage: q.passPercentage,
              timeLimitMinutes: q.timeLimitMinutes,
              tenantId,
              questions: {
                create: q.questions.map((question) => ({
                  questionText: question.questionText,
                  questionType: question.questionType,
                  optionsJson: question.optionsJson ?? undefined,
                  correctOptionsJson: question.correctOptionsJson ?? undefined,
                  correctAnswerText: question.correctAnswerText,
                  explanation: question.explanation,
                  order: question.order,
                  tenantId,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${newCourse.id}`);
}

export async function deleteCourse(courseId: string) {
  await requireAdmin();
  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function reorderChapters(courseId: string, orderedIds: string[]) {
  await requireAdmin();

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.chapter.update({
        where: { id, courseId },
        data: { order: index },
      }),
    ),
  );

  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function uploadThumbnail(
  courseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  // Tenant-scoped lookup: throws if courseId doesn't belong to this tenant,
  // which stops a cross-tenant courseId before any storage write happens.
  try {
    await prisma.course.findUniqueOrThrow({ where: { id: courseId } });
  } catch {
    return { error: "Course not found." };
  }

  const file = formData.get("thumbnail");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }

  const validation = validateUpload(file, { allowedPrefix: "image/", maxBytes: 5 * 1024 * 1024 });
  if (!validation.ok) {
    return { error: validation.error };
  }

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = buildCourseThumbnailPath(tenantId, courseId, ext);

  const { error: uploadError } = await supabase.storage
    .from(COURSE_ASSETS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: describeStorageError(uploadError) };
  }

  const { data } = supabase.storage.from(COURSE_ASSETS_BUCKET).getPublicUrl(path);

  await prisma.course.update({
    where: { id: courseId },
    data: { thumbnailUrl: data.publicUrl },
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}

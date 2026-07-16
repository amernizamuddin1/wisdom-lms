"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { touchCourseUpdatedAt } from "@/lib/course-content";

export async function createChapter(courseId: string, title: string) {
  await requireAdmin();
  const tenantId = await getTenantId();

  if (!title.trim()) {
    throw new Error("Chapter title is required.");
  }

  const last = await prisma.chapter.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
  });

  const chapter = await prisma.chapter.create({
    data: { courseId, title: title.trim(), order: (last?.order ?? -1) + 1, tenantId },
  });

  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  return chapter;
}

export async function updateChapterTitle(courseId: string, chapterId: string, title: string) {
  await requireAdmin();

  if (!title.trim()) {
    throw new Error("Chapter title is required.");
  }

  await prisma.chapter.update({
    where: { id: chapterId, courseId },
    data: { title: title.trim() },
  });

  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteChapter(courseId: string, chapterId: string) {
  await requireAdmin();
  await prisma.chapter.delete({ where: { id: chapterId, courseId } });
  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function reorderLessons(
  courseId: string,
  chapterId: string,
  orderedIds: string[],
) {
  await requireAdmin();

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lesson.update({
        where: { id, chapterId },
        data: { order: index },
      }),
    ),
  );

  await touchCourseUpdatedAt(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
}

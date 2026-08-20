import "server-only";
import { prisma } from "@/lib/prisma";
import { invalidatePublicCourseCache } from "@/lib/public-cache";

// Bumps Course.updatedAt from a curriculum mutation (chapter/lesson create,
// edit, delete, reorder) so the course page's public "Last updated" reflects
// curriculum changes, not just the metadata fields Course.update already
// touches directly.
export async function touchCourseUpdatedAt(courseId: string): Promise<void> {
  await prisma.course.update({ where: { id: courseId }, data: { updatedAt: new Date() } });
  await invalidatePublicCourseCache();
}

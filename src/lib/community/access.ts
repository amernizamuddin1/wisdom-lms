import "server-only";
import { prisma } from "@/lib/prisma";
import { isAccessExpired } from "@/lib/access";
import { getTenantId } from "@/lib/tenant-context";

// Course discussion entitlement check — reuses the existing hot-path pattern
// (Enrollment row with status ACTIVE for [userId, courseId]) plus
// isAccessExpired() to also reject expired-but-not-yet-recomputed rows.
// Admins always pass (moderation console needs to see every course board).
export async function canAccessCourseDiscussion(
  userId: string,
  courseId: string,
  role?: "ADMIN" | "STUDENT",
): Promise<boolean> {
  if (role === "ADMIN") return true;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { status: true, isPermanent: true, accessEndAt: true },
  });

  if (!enrollment || enrollment.status !== "ACTIVE") return false;
  if (isAccessExpired(enrollment)) return false;
  return true;
}

// Checks CommunityUserRestriction for an active row: no liftedAt AND
// (expiresAt is null OR expiresAt > now).
export async function isUserRestricted(userId: string): Promise<boolean> {
  const now = new Date();
  const active = await prisma.communityUserRestriction.findFirst({
    where: {
      userId,
      liftedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  return active != null;
}

export async function getCommunitySettings() {
  const tenantId = await getTenantId();
  const settings = await prisma.communitySettings.findUnique({ where: { tenantId } });
  if (settings) return settings;
  // Defensive fallback in case the seed migration hasn't run in this env yet.
  return prisma.communitySettings.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { computeAccess, durationChoiceFor } from "@/lib/access";
import { grantCourseAccess } from "@/lib/entitlements";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

// Merges a freshly-computed access window into a possibly-existing Enrollment
// row, never shortening access already granted (from any source), and records
// this grant event as its own EnrollmentGrant row (see lib/entitlements.ts).
async function mergeCourseAccess(
  tx: Tx,
  params: {
    userId: string;
    courseId: string;
    startAt: Date;
    accessEndAt: Date | null;
    accessDurationMonths: number | null;
    isPermanent: boolean;
    bundleId: string;
    sourceOrderId?: string;
  },
) {
  await grantCourseAccess(tx, {
    userId: params.userId,
    courseId: params.courseId,
    source: "BUNDLE",
    sourceBundleId: params.bundleId,
    sourceOrderId: params.sourceOrderId,
    startAt: params.startAt,
    accessEndAt: params.accessEndAt,
    accessDurationMonths: params.accessDurationMonths,
    isPermanent: params.isPermanent,
  });
}

// Grants (or refreshes) a user's access to every course currently in a bundle.
// Idempotent: calling this again for the same user/bundle only ever extends
// access, never shortens or duplicates it.
export async function grantBundleAccess(
  tx: Tx,
  params: { userId: string; bundleId: string; startAt: Date; sourceOrderId?: string },
) {
  const tenantId = await getTenantId();

  const bundle = await tx.courseBundle.findUniqueOrThrow({
    where: { id: params.bundleId },
    include: { courses: true },
  });

  await tx.bundleEnrollment.upsert({
    where: { userId_bundleId: { userId: params.userId, bundleId: params.bundleId } },
    create: {
      tenantId,
      userId: params.userId,
      bundleId: params.bundleId,
      status: "ACTIVE",
      enrolledAt: params.startAt,
      sourceOrderId: params.sourceOrderId,
    },
    update: { status: "ACTIVE" },
  });

  const access = computeAccess(params.startAt, durationChoiceFor(bundle.accessDurationMonths), null);

  for (const bc of bundle.courses) {
    await mergeCourseAccess(tx, {
      userId: params.userId,
      courseId: bc.courseId,
      startAt: params.startAt,
      accessEndAt: access.accessEndAt,
      accessDurationMonths: access.accessDurationMonths,
      isPermanent: access.isPermanent,
      bundleId: params.bundleId,
      sourceOrderId: params.sourceOrderId,
    });
  }
}

// Called when an admin adds a course to a bundle that already has active
// entitlements. Grants the new course to every existing active bundle
// enrollee, computing each learner's access window relative to *their own*
// original enrolledAt rather than "now" — so a learner who joined a 12-month
// bundle 2 months in still gets a window consistent with their purchase,
// not a fresh 12 months starting today.
export async function backfillNewBundleCourse(
  tx: Tx,
  params: { bundleId: string; courseId: string },
) {
  const bundle = await tx.courseBundle.findUniqueOrThrow({ where: { id: params.bundleId } });
  const activeEnrollments = await tx.bundleEnrollment.findMany({
    where: { bundleId: params.bundleId, status: "ACTIVE" },
  });

  const choice = durationChoiceFor(bundle.accessDurationMonths);

  for (const be of activeEnrollments) {
    const access = computeAccess(be.enrolledAt, choice, null);
    await mergeCourseAccess(tx, {
      userId: be.userId,
      courseId: params.courseId,
      startAt: be.enrolledAt,
      accessEndAt: access.accessEndAt,
      accessDurationMonths: access.accessDurationMonths,
      isPermanent: access.isPermanent,
      bundleId: params.bundleId,
    });
  }
}

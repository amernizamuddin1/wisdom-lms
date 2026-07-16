import "server-only";
import { Prisma, type EnrollmentSource } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

export type GrantCourseAccessParams = {
  userId: string;
  courseId: string;
  source: EnrollmentSource;
  sourceBundleId?: string;
  sourceOrderId?: string;
  startAt: Date;
  accessEndAt: Date | null;
  accessDurationMonths: number | null;
  isPermanent: boolean;
};

// Upserts the Enrollment row — merging into any existing access window and
// never shortening it, regardless of source — and records this specific
// grant event as its own EnrollmentGrant row. That grant row is what lets the
// admin console later revoke this one source of access (e.g. a bundle grant)
// without touching another still-active source (e.g. a direct purchase) for
// the same course.
export async function grantCourseAccess(tx: Tx, params: GrantCourseAccessParams): Promise<string> {
  const tenantId = await getTenantId();
  const existing = await tx.enrollment.findUnique({
    where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
  });

  let enrollmentId: string;

  if (!existing) {
    const created = await tx.enrollment.create({
      data: {
        tenantId,
        userId: params.userId,
        courseId: params.courseId,
        status: "ACTIVE",
        accessStartAt: params.startAt,
        accessEndAt: params.accessEndAt,
        accessDurationMonths: params.accessDurationMonths,
        isPermanent: params.isPermanent,
        source: params.source,
        sourceBundleId: params.sourceBundleId,
        sourceOrderId: params.sourceOrderId,
      },
    });
    enrollmentId = created.id;
  } else {
    const resultIsPermanent = existing.isPermanent || params.isPermanent;
    const resultAccessEndAt = resultIsPermanent
      ? null
      : existing.accessEndAt && params.accessEndAt
        ? (existing.accessEndAt > params.accessEndAt ? existing.accessEndAt : params.accessEndAt)
        : (existing.accessEndAt ?? params.accessEndAt);

    await tx.enrollment.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        isPermanent: resultIsPermanent,
        accessEndAt: resultAccessEndAt,
        accessDurationMonths: resultIsPermanent ? null : params.accessDurationMonths,
      },
    });
    enrollmentId = existing.id;
  }

  await tx.enrollmentGrant.create({
    data: {
      tenantId,
      enrollmentId,
      status: "ACTIVE",
      source: params.source,
      sourceBundleId: params.sourceBundleId,
      sourceOrderId: params.sourceOrderId,
      accessStartAt: params.startAt,
      accessEndAt: params.accessEndAt,
      accessDurationMonths: params.accessDurationMonths,
      isPermanent: params.isPermanent,
    },
  });

  return enrollmentId;
}

// Re-derives the parent Enrollment's status/access window from whatever
// EnrollmentGrant rows are still ACTIVE. Called after any grant is revoked so
// course access is only lost once every source granting it has been removed.
export async function recomputeEnrollmentFromGrants(tx: Tx, enrollmentId: string) {
  const activeGrants = await tx.enrollmentGrant.findMany({
    where: { enrollmentId, status: "ACTIVE" },
  });

  if (activeGrants.length === 0) {
    await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: "CANCELLED" } });
    return;
  }

  const permanentGrant = activeGrants.find((g) => g.isPermanent);
  if (permanentGrant) {
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "ACTIVE", isPermanent: true, accessEndAt: null, accessDurationMonths: null },
    });
    return;
  }

  const latest = activeGrants.reduce((a, b) =>
    (a.accessEndAt ?? new Date(0)) > (b.accessEndAt ?? new Date(0)) ? a : b,
  );

  await tx.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: "ACTIVE",
      isPermanent: false,
      accessEndAt: latest.accessEndAt,
      accessDurationMonths: latest.accessDurationMonths,
    },
  });
}

// Revokes a single grant, recomputes the parent Enrollment's effective access
// from whatever grants remain, and writes an audit log entry. No-ops if the
// grant is already revoked (safe to call from a bulk loop without re-checking).
export async function revokeGrant(
  tx: Tx,
  params: { grantId: string; adminId: string; reason?: string | null },
) {
  const tenantId = await getTenantId();
  const grant = await tx.enrollmentGrant.findUniqueOrThrow({
    where: { id: params.grantId },
    include: { enrollment: { include: { course: true } } },
  });

  if (grant.status !== "ACTIVE") return;

  const previousStatus = grant.enrollment.status;

  await tx.enrollmentGrant.update({
    where: { id: grant.id },
    data: {
      status: "CANCELLED",
      revokedAt: new Date(),
      revokedById: params.adminId,
      revocationReason: params.reason ?? null,
    },
  });

  await recomputeEnrollmentFromGrants(tx, grant.enrollmentId);

  const updated = await tx.enrollment.findUniqueOrThrow({ where: { id: grant.enrollmentId } });

  await tx.adminAuditLog.create({
    data: {
      tenantId,
      adminId: params.adminId,
      subscriberId: grant.enrollment.userId,
      action: "REVOKE_COURSE_GRANT",
      targetType: "COURSE",
      targetId: grant.enrollment.courseId,
      targetTitleSnapshot: grant.enrollment.course.title,
      previousStatus,
      newStatus: updated.status,
      reason: params.reason ?? null,
    },
  });
}

// Revokes an entire bundle: marks the BundleEnrollment revoked, then revokes
// every course grant that came from this bundle for this user — recomputing
// each course's net access individually, so a course that also has a
// separate direct grant stays accessible.
export async function revokeBundleEnrollment(
  tx: Tx,
  params: { bundleEnrollmentId: string; adminId: string; reason?: string | null },
) {
  const tenantId = await getTenantId();
  const be = await tx.bundleEnrollment.findUniqueOrThrow({
    where: { id: params.bundleEnrollmentId },
    include: { bundle: true },
  });

  if (be.status === "ACTIVE") {
    await tx.bundleEnrollment.update({
      where: { id: be.id },
      data: {
        status: "CANCELLED",
        revokedAt: new Date(),
        revokedById: params.adminId,
        revocationReason: params.reason ?? null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        tenantId,
        adminId: params.adminId,
        subscriberId: be.userId,
        action: "REVOKE_BUNDLE",
        targetType: "BUNDLE",
        targetId: be.bundleId,
        targetTitleSnapshot: be.bundle.name,
        previousStatus: "ACTIVE",
        newStatus: "CANCELLED",
        reason: params.reason ?? null,
      },
    });
  }

  const grants = await tx.enrollmentGrant.findMany({
    where: { sourceBundleId: be.bundleId, status: "ACTIVE", enrollment: { userId: be.userId } },
  });

  for (const grant of grants) {
    await revokeGrant(tx, { grantId: grant.id, adminId: params.adminId, reason: params.reason });
  }
}

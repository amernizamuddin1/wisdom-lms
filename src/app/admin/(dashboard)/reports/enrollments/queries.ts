import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, EnrollmentSource, EnrollmentStatus } from "@/generated/prisma/client";

// Shared between the report page and the CSV export action so both read
// exactly the same filtered result set — the CSV must always match what's
// currently on screen.

export type EnrollmentReportParams = {
  scope?: string;
  courseId?: string;
  bundleId?: string;
  status?: string;
  email?: string;
  enrolledFrom?: string;
  enrolledTo?: string;
  accessFrom?: string;
  accessTo?: string;
};

export const SOURCE_LABELS: Record<EnrollmentSource, string> = {
  DIRECT: "Direct",
  BUNDLE: "Bundle",
  ADMIN_ASSIGNED: "Admin-assigned",
  CSV_IMPORT: "CSV import",
  FREE_CHECKOUT: "Free checkout",
};

// Caps both the on-screen table and the CSV export at the same size, so the
// two are always in sync — same rationale as the other admin list pages'
// `take` limits (orders, users).
export const MAX_ROWS = 1000;

export function buildEnrollmentWhere(params: EnrollmentReportParams): Prisma.EnrollmentWhereInput {
  const where: Prisma.EnrollmentWhereInput = {};

  if (params.scope === "course" && params.courseId) {
    where.courseId = params.courseId;
  } else if (params.scope === "bundle" && params.bundleId) {
    where.sourceBundleId = params.bundleId;
  }

  if (params.status === "ACTIVE" || params.status === "CANCELLED") {
    where.status = params.status as EnrollmentStatus;
  }

  if (params.email) {
    where.user = { email: { contains: params.email, mode: "insensitive" } };
  }

  if (params.enrolledFrom || params.enrolledTo) {
    where.enrolledAt = {
      ...(params.enrolledFrom ? { gte: new Date(params.enrolledFrom) } : {}),
      ...(params.enrolledTo ? { lte: new Date(`${params.enrolledTo}T23:59:59`) } : {}),
    };
  }

  // Access-window overlap: an enrollment's access window is
  // [accessStartAt, accessEndAt ?? +infinity]. It overlaps the requested
  // [accessFrom, accessTo] range when the window starts on/before the
  // requested end AND (is permanent/still-open OR ends on/after the
  // requested start). This is independent of the enrolledAt filter above —
  // both can be combined.
  if (params.accessFrom || params.accessTo) {
    if (params.accessTo) {
      where.accessStartAt = { lte: new Date(`${params.accessTo}T23:59:59`) };
    }
    if (params.accessFrom) {
      where.OR = [
        { accessEndAt: null },
        { accessEndAt: { gte: new Date(params.accessFrom) } },
      ];
    }
  }

  return where;
}

export async function fetchEnrollmentReportRows(params: EnrollmentReportParams) {
  const where = buildEnrollmentWhere(params);

  return prisma.enrollment.findMany({
    where,
    orderBy: { enrolledAt: "desc" },
    take: MAX_ROWS,
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
      sourceBundle: { select: { name: true } },
    },
  });
}

export type EnrollmentReportRow = Awaited<ReturnType<typeof fetchEnrollmentReportRows>>[number];

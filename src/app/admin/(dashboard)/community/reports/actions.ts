"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logModerationAction } from "@/lib/community/moderation";

export type ActionResult = { error?: string; success?: boolean };

async function getReportOrThrow(reportId: string) {
  return prisma.discussionReport.findUniqueOrThrow({ where: { id: reportId } });
}

export async function markReportUnderReviewAction(reportId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const report = await getReportOrThrow(reportId);

  await prisma.$transaction(async (tx) => {
    await tx.discussionReport.update({
      where: { id: reportId },
      data: { status: "UNDER_REVIEW", reviewedById: admin.id, reviewedAt: new Date() },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "REVIEW_REPORT",
      entityType: report.entityType,
      entityId: report.entityId,
      previousState: report.status,
      newState: "UNDER_REVIEW",
    });
  });

  revalidatePath("/admin/community/reports");
  return { success: true };
}

export async function resolveReportAction(reportId: string, resolutionNotes?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const report = await getReportOrThrow(reportId);

  await prisma.$transaction(async (tx) => {
    await tx.discussionReport.update({
      where: { id: reportId },
      data: {
        status: "RESOLVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        resolutionNotes: resolutionNotes || null,
      },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "RESOLVE_REPORT",
      entityType: report.entityType,
      entityId: report.entityId,
      previousState: report.status,
      newState: "RESOLVED",
      reason: resolutionNotes,
    });
  });

  revalidatePath("/admin/community/reports");
  return { success: true };
}

export async function dismissReportAction(reportId: string, resolutionNotes?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const report = await getReportOrThrow(reportId);

  await prisma.$transaction(async (tx) => {
    await tx.discussionReport.update({
      where: { id: reportId },
      data: {
        status: "DISMISSED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        resolutionNotes: resolutionNotes || null,
      },
    });
    await logModerationAction(tx, {
      actorId: admin.id,
      actionType: "DISMISS_REPORT",
      entityType: report.entityType,
      entityId: report.entityId,
      previousState: report.status,
      newState: "DISMISSED",
      reason: resolutionNotes,
    });
  });

  revalidatePath("/admin/community/reports");
  return { success: true };
}

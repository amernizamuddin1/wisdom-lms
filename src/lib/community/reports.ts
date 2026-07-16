import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";

export type ReportEntityType = "THREAD" | "ANSWER" | "REPLY";
export type ReportReason = "SPAM" | "HARASSMENT" | "OFFENSIVE" | "MISLEADING" | "INAPPROPRIATE" | "OTHER";

// Duplicate-report prevention is an app-level check (query for an existing
// OPEN/UNDER_REVIEW report by this reporter for this entity before insert)
// rather than a DB constraint — see plan's schema notes.
export async function createReport(params: {
  reporterId: string;
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  details?: string;
}): Promise<{ created: boolean }> {
  const existingActive = await prisma.discussionReport.findFirst({
    where: {
      reporterId: params.reporterId,
      entityType: params.entityType,
      entityId: params.entityId,
      status: { in: ["OPEN", "UNDER_REVIEW"] },
    },
  });
  if (existingActive) return { created: false };

  const tenantId = await getTenantId();
  await prisma.discussionReport.create({
    data: {
      reporterId: params.reporterId,
      entityType: params.entityType,
      entityId: params.entityId,
      reason: params.reason,
      details: params.details,
      tenantId,
    },
  });
  return { created: true };
}

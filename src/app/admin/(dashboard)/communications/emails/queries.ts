import "server-only";
import { prisma } from "@/lib/prisma";
import type { EmailCampaignStatus } from "@/generated/prisma/client";

export type EmailCampaignListParams = {
  status?: string;
  q?: string;
};

export function buildEmailCampaignWhere(params: EmailCampaignListParams) {
  const where: import("@/generated/prisma/client").Prisma.EmailCampaignWhereInput = {};

  if (params.status && params.status !== "any") {
    where.status = params.status as EmailCampaignStatus;
  }
  if (params.q) {
    where.OR = [
      { internalName: { contains: params.q, mode: "insensitive" } },
      { subject: { contains: params.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function fetchEmailCampaigns(params: EmailCampaignListParams) {
  return prisma.emailCampaign.findMany({
    where: buildEmailCampaignWhere(params),
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { recipients: true } },
    },
  });
}

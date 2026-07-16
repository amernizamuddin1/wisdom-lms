import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";

export type AnalyticsSettings = {
  activeWindowDays: number;
  slowingDownDays: number;
  atRiskDays: number;
  dormantDays: number;
};

const DEFAULTS: AnalyticsSettings = {
  activeWindowDays: 7,
  slowingDownDays: 7,
  atRiskDays: 14,
  dormantDays: 30,
};

export async function getAnalyticsSettings(): Promise<AnalyticsSettings> {
  const tenantId = await getTenantId();
  const row = await prisma.settings.findUnique({
    where: { tenantId },
    select: {
      analyticsActiveWindowDays: true,
      analyticsSlowingDownDays: true,
      analyticsAtRiskDays: true,
      analyticsDormantDays: true,
    },
  });
  if (!row) return DEFAULTS;
  return {
    activeWindowDays: row.analyticsActiveWindowDays,
    slowingDownDays: row.analyticsSlowingDownDays,
    atRiskDays: row.analyticsAtRiskDays,
    dormantDays: row.analyticsDormantDays,
  };
}

import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";

// Single source of truth for white-label branding. Every value falls back to
// today's hardcoded "Wisdom LMS" defaults so the app looks unchanged until an
// admin configures branding in /admin/settings.
export const BRANDING_DEFAULTS = {
  platformName: "Wisdom LMS",
  shortName: "Wisdom",
  adminPanelName: "Wisdom LMS Admin",
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  primaryColor: "#6548e8",
  darkPrimaryColor: "#8068ff",
  supportEmail: null as string | null,
  footerText: null as string | null,
};

export type Branding = typeof BRANDING_DEFAULTS;

export const getBranding = cache(async function getBranding(): Promise<Branding> {
  const tenantId = await getTenantId();
  const settings = await prisma.settings.findUnique({ where: { tenantId } });

  return {
    platformName: settings?.platformName || BRANDING_DEFAULTS.platformName,
    shortName: settings?.shortName || BRANDING_DEFAULTS.shortName,
    adminPanelName: settings?.adminPanelName || BRANDING_DEFAULTS.adminPanelName,
    logoUrl: settings?.logoUrl ?? BRANDING_DEFAULTS.logoUrl,
    faviconUrl: settings?.faviconUrl ?? BRANDING_DEFAULTS.faviconUrl,
    primaryColor: settings?.primaryColor || BRANDING_DEFAULTS.primaryColor,
    darkPrimaryColor: settings?.darkPrimaryColor || BRANDING_DEFAULTS.darkPrimaryColor,
    supportEmail: settings?.supportEmail ?? BRANDING_DEFAULTS.supportEmail,
    footerText: settings?.footerText ?? BRANDING_DEFAULTS.footerText,
  };
});

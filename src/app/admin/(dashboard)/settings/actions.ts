"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import { encrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Prisma } from "@/generated/prisma/client";

export type SettingsActionState = { error?: string; success?: boolean };

async function uploadBrandingAsset(file: File, prefix: string): Promise<string> {
  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `branding/${prefix}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("course-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function saveBrandingSettings(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const platformName = String(formData.get("platformName") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim();
  const adminPanelName = String(formData.get("adminPanelName") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const darkPrimaryColor = String(formData.get("darkPrimaryColor") ?? "").trim();
  const supportEmail = String(formData.get("supportEmail") ?? "").trim();
  const footerText = String(formData.get("footerText") ?? "").trim();

  const data: Omit<Prisma.SettingsUncheckedCreateInput, "tenantId"> = {
    platformName: platformName || null,
    shortName: shortName || null,
    adminPanelName: adminPanelName || null,
    primaryColor: primaryColor || null,
    darkPrimaryColor: darkPrimaryColor || null,
    supportEmail: supportEmail || null,
    footerText: footerText || null,
  };

  const favicon = formData.get("favicon");
  if (favicon instanceof File && favicon.size > 0) {
    try {
      data.faviconUrl = await uploadBrandingAsset(favicon, "favicon");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Favicon upload failed." };
    }
  }

  await prisma.settings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function uploadLogo(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `branding/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("course-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from("course-assets").getPublicUrl(path);

  await prisma.settings.upsert({
    where: { tenantId },
    create: { tenantId, logoUrl: data.publicUrl },
    update: { logoUrl: data.publicUrl },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function saveRazorpaySettings(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const keyId = String(formData.get("keyId") ?? "").trim();
  const keySecret = String(formData.get("keySecret") ?? "").trim();
  const webhookSecret = String(formData.get("webhookSecret") ?? "").trim();

  const data: Omit<Prisma.SettingsUncheckedCreateInput, "tenantId"> = {};
  if (keyId) data.razorpayKeyIdEncrypted = encrypt(keyId);
  if (keySecret) data.razorpayKeySecretEncrypted = encrypt(keySecret);
  if (webhookSecret) data.razorpayWebhookSecretEncrypted = encrypt(webhookSecret);

  if (Object.keys(data).length === 0) {
    return { error: "Enter at least one value to update." };
  }

  await prisma.settings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function saveAnalyticsSettings(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const activeWindowDays = Number(formData.get("activeWindowDays"));
  const slowingDownDays = Number(formData.get("slowingDownDays"));
  const atRiskDays = Number(formData.get("atRiskDays"));
  const dormantDays = Number(formData.get("dormantDays"));

  const values = { activeWindowDays, slowingDownDays, atRiskDays, dormantDays };
  for (const value of Object.values(values)) {
    if (!Number.isInteger(value) || value < 1) {
      return { error: "All thresholds must be whole numbers of at least 1 day." };
    }
  }

  await prisma.settings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      analyticsActiveWindowDays: activeWindowDays,
      analyticsSlowingDownDays: slowingDownDays,
      analyticsAtRiskDays: atRiskDays,
      analyticsDormantDays: dormantDays,
    },
    update: {
      analyticsActiveWindowDays: activeWindowDays,
      analyticsSlowingDownDays: slowingDownDays,
      analyticsAtRiskDays: atRiskDays,
      analyticsDormantDays: dormantDays,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/analytics");
  return { success: true };
}

export async function saveResendSettings(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const senderEmail = String(formData.get("senderEmail") ?? "").trim();
  const senderName = String(formData.get("senderName") ?? "").trim();

  const data: Omit<Prisma.SettingsUncheckedCreateInput, "tenantId"> = {};
  if (apiKey) data.resendApiKeyEncrypted = encrypt(apiKey);
  if (senderEmail) data.resendSenderEmail = senderEmail;
  if (senderName) data.resendSenderName = senderName;

  if (Object.keys(data).length === 0) {
    return { error: "Enter at least one value to update." };
  }

  await prisma.settings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

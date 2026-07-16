"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeCommunicationHtml } from "@/lib/sanitize";
import { resolveAudience, type AudienceSelection } from "@/lib/communications/audience";
import { sendEmailCampaign, sendTestEmail } from "@/lib/communications/send-email-campaign";
import { getStarterHtml, type StarterTemplateId } from "@/lib/email-templates/starters";
import { getBranding } from "@/lib/branding";
import type { CommunicationAudienceType } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };

function readAudience(formData: FormData): AudienceSelection {
  return {
    audienceType: String(formData.get("audienceType") ?? "MANUAL") as CommunicationAudienceType,
    selectedCourseIds: formData.getAll("selectedCourseIds").map(String),
    selectedBundleIds: formData.getAll("selectedBundleIds").map(String),
    manuallySelectedUserIds: formData.getAll("manuallySelectedUserIds").map(String),
    excludedUserIds: formData.getAll("excludedUserIds").map(String),
  };
}

function readCampaignFields(formData: FormData) {
  return {
    internalName: String(formData.get("internalName") ?? "").trim(),
    subject: String(formData.get("subject") ?? "").trim(),
    preheader: String(formData.get("preheader") ?? "").trim() || null,
    htmlContent: sanitizeCommunicationHtml(String(formData.get("htmlContent") ?? "")),
    senderName: String(formData.get("senderName") ?? "").trim() || null,
    fromEmail: String(formData.get("fromEmail") ?? "").trim() || null,
    replyTo: String(formData.get("replyTo") ?? "").trim() || null,
  };
}

export async function createDraftCampaign(templateId: StarterTemplateId) {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();
  const branding = await getBranding();

  const campaign = await prisma.emailCampaign.create({
    data: {
      internalName: "Untitled campaign",
      subject: "",
      htmlContent: getStarterHtml(templateId, branding),
      audienceType: "MIXED",
      createdById: admin.id,
      tenantId,
    },
  });

  revalidatePath("/admin/communications/emails");
  redirect(`/admin/communications/emails/${campaign.id}`);
}

export async function saveCampaignDraft(
  campaignId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const existing = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!existing) return { error: "Campaign not found." };
  if (existing.status === "SENT" || existing.status === "SENDING") {
    return { error: "Sent campaigns cannot be edited." };
  }

  const fields = readCampaignFields(formData);
  if (!fields.internalName) return { error: "Internal name is required." };

  const audience = readAudience(formData);

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { ...fields, ...audience, status: "DRAFT", scheduledAt: null },
  });

  revalidatePath(`/admin/communications/emails/${campaignId}`);
  revalidatePath("/admin/communications/emails");
  return { success: true };
}

export async function previewCampaignRecipients(formData: FormData) {
  await requireAdmin();
  const audience = readAudience(formData);
  const recipients = await resolveAudience(audience);
  return recipients;
}

export async function sendCampaignNow(
  campaignId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const existing = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!existing) return { error: "Campaign not found." };
  if (existing.status === "SENT" || existing.status === "SENDING") {
    return { error: "This campaign has already been sent or is currently sending." };
  }

  const fields = readCampaignFields(formData);
  if (!fields.internalName || !fields.subject || !fields.htmlContent.trim()) {
    return { error: "Subject and email body are required before sending." };
  }
  const audience = readAudience(formData);

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { ...fields, ...audience, status: "DRAFT", scheduledAt: null },
  });

  const result = await sendEmailCampaign(campaignId);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/admin/communications/emails/${campaignId}`);
  revalidatePath("/admin/communications/emails");
  return { success: true };
}

export async function scheduleCampaign(
  campaignId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const existing = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!existing) return { error: "Campaign not found." };
  if (existing.status === "SENT" || existing.status === "SENDING") {
    return { error: "This campaign has already been sent or is currently sending." };
  }

  const fields = readCampaignFields(formData);
  if (!fields.internalName || !fields.subject || !fields.htmlContent.trim()) {
    return { error: "Subject and email body are required before scheduling." };
  }
  const audience = readAudience(formData);
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return { error: "A valid schedule date/time is required." };
  }

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { ...fields, ...audience, status: "SCHEDULED", scheduledAt },
  });

  revalidatePath(`/admin/communications/emails/${campaignId}`);
  revalidatePath("/admin/communications/emails");
  return { success: true };
}

export async function sendTestEmailAction(
  campaignId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: "Campaign not found." };

  const raw = String(formData.get("testEmails") ?? "");
  const addresses = raw
    .split(/[,\n]/)
    .map((e) => e.trim())
    .filter(Boolean);
  if (addresses.length === 0) return { error: "Enter at least one test email address." };

  const fields = readCampaignFields(formData);

  const result = await sendTestEmail(
    {
      subject: fields.subject || campaign.subject,
      htmlContent: fields.htmlContent || campaign.htmlContent,
      senderName: fields.senderName ?? campaign.senderName,
      fromEmail: fields.fromEmail ?? campaign.fromEmail,
      replyTo: fields.replyTo ?? campaign.replyTo,
    },
    addresses,
  );

  if (!result.ok) return { error: result.error };
  return { success: true };
}

export async function duplicateCampaign(campaignId: string) {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const source = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!source) throw new Error("Campaign not found.");

  const copy = await prisma.emailCampaign.create({
    data: {
      internalName: `${source.internalName} (Copy)`,
      subject: source.subject,
      preheader: source.preheader,
      htmlContent: source.htmlContent,
      editorContentJson: source.editorContentJson ?? undefined,
      senderName: source.senderName,
      fromEmail: source.fromEmail,
      replyTo: source.replyTo,
      audienceType: source.audienceType,
      selectedCourseIds: source.selectedCourseIds,
      selectedBundleIds: source.selectedBundleIds,
      manuallySelectedUserIds: source.manuallySelectedUserIds,
      excludedUserIds: source.excludedUserIds,
      status: "DRAFT",
      createdById: admin.id,
      tenantId,
    },
  });

  revalidatePath("/admin/communications/emails");
  redirect(`/admin/communications/emails/${copy.id}`);
}

export type UploadImageState = { error?: string; url?: string };

// Shared by the email and notification rich editors — images must be
// publicly reachable URLs (email clients can't load local/blob URLs), so
// this reuses the same Supabase Storage bucket + public-URL convention as
// logo/thumbnail uploads elsewhere in the admin.
export async function uploadCommunicationImage(
  _prevState: UploadImageState,
  formData: FormData,
): Promise<UploadImageState> {
  await requireAdmin();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only image files are allowed." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image must be under 5MB." };
  }

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `communications/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("course-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function deleteCampaign(campaignId: string) {
  await requireAdmin();
  const existing = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (existing && (existing.status === "SENT" || existing.status === "SENDING")) {
    throw new Error("Sent campaigns cannot be deleted — they're part of the communications history.");
  }
  await prisma.emailCampaign.delete({ where: { id: campaignId } });
  revalidatePath("/admin/communications/emails");
  redirect("/admin/communications/emails");
}

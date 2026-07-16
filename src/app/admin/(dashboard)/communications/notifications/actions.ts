"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { sanitizeCommunicationHtml } from "@/lib/sanitize";
import { resolveAudience, type AudienceSelection } from "@/lib/communications/audience";
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

function readNotificationFields(formData: FormData) {
  return {
    internalName: String(formData.get("internalName") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    richContent: sanitizeCommunicationHtml(String(formData.get("richContent") ?? "")),
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || null,
    ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
    priority: (String(formData.get("priority") ?? "NORMAL") || "NORMAL") as "LOW" | "NORMAL" | "HIGH",
  };
}

export async function createDraftNotification() {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const notification = await prisma.notification.create({
    data: {
      internalName: "Untitled notification",
      title: "",
      richContent: "<p></p>",
      audienceType: "MIXED",
      createdById: admin.id,
      tenantId,
    },
  });

  revalidatePath("/admin/communications/notifications");
  redirect(`/admin/communications/notifications/${notification.id}`);
}

export async function saveNotificationDraft(
  notificationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const existing = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!existing) return { error: "Notification not found." };

  const fields = readNotificationFields(formData);
  if (!fields.internalName) return { error: "Internal name is required." };

  const audience = readAudience(formData);
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const startAtRaw = String(formData.get("scheduledAt") ?? "");

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      ...fields,
      ...audience,
      status: "DRAFT",
      publishedAt: null,
      scheduledAt: startAtRaw ? new Date(startAtRaw) : null,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  });

  revalidatePath(`/admin/communications/notifications/${notificationId}`);
  revalidatePath("/admin/communications/notifications");
  return { success: true };
}

export async function previewNotificationRecipients(formData: FormData) {
  await requireAdmin();
  const audience = readAudience(formData);
  return resolveAudience(audience);
}

export async function publishNotification(
  notificationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const existing = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!existing) return { error: "Notification not found." };

  const fields = readNotificationFields(formData);
  if (!fields.internalName || !fields.title || !fields.richContent.trim()) {
    return { error: "Title and message body are required before publishing." };
  }
  const audience = readAudience(formData);
  const recipients = await resolveAudience(audience);
  if (recipients.length === 0) {
    return { error: "No valid recipients resolved for this audience." };
  }

  const expiresAtRaw = String(formData.get("expiresAt") ?? "");

  await prisma.$transaction([
    prisma.notification.update({
      where: { id: notificationId },
      data: {
        ...fields,
        ...audience,
        status: "PUBLISHED",
        publishedAt: new Date(),
        scheduledAt: null,
        expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
      },
    }),
    prisma.notificationRecipient.createMany({
      data: recipients.map((r) => ({ notificationId, userId: r.id, tenantId })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath(`/admin/communications/notifications/${notificationId}`);
  revalidatePath("/admin/communications/notifications");
  return { success: true };
}

export async function scheduleNotification(
  notificationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const existing = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!existing) return { error: "Notification not found." };

  const fields = readNotificationFields(formData);
  if (!fields.internalName || !fields.title || !fields.richContent.trim()) {
    return { error: "Title and message body are required before scheduling." };
  }
  const audience = readAudience(formData);
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return { error: "A valid schedule date/time is required." };
  }
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      ...fields,
      ...audience,
      status: "SCHEDULED",
      scheduledAt,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  });

  revalidatePath(`/admin/communications/notifications/${notificationId}`);
  revalidatePath("/admin/communications/notifications");
  return { success: true };
}

export async function duplicateNotification(notificationId: string) {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const source = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!source) throw new Error("Notification not found.");

  const copy = await prisma.notification.create({
    data: {
      internalName: `${source.internalName} (Copy)`,
      title: source.title,
      richContent: source.richContent,
      editorContentJson: source.editorContentJson ?? undefined,
      imageUrl: source.imageUrl,
      ctaLabel: source.ctaLabel,
      ctaUrl: source.ctaUrl,
      priority: source.priority,
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

  revalidatePath("/admin/communications/notifications");
  redirect(`/admin/communications/notifications/${copy.id}`);
}

export async function deleteNotification(notificationId: string) {
  await requireAdmin();
  await prisma.notification.delete({ where: { id: notificationId } });
  revalidatePath("/admin/communications/notifications");
  redirect("/admin/communications/notifications");
}

export type BulkDeleteResult = { deletedCount: number; skippedCount: number };

// Published notifications are excluded from bulk delete — same rule as the
// single-item delete button on the detail page, which only ever shows for
// non-published notifications, since a published notification is the actual
// historical send record.
export async function bulkDeleteNotifications(notificationIds: string[]): Promise<BulkDeleteResult> {
  await requireAdmin();
  if (notificationIds.length === 0) return { deletedCount: 0, skippedCount: 0 };

  const result = await prisma.notification.deleteMany({
    where: { id: { in: notificationIds }, status: { not: "PUBLISHED" } },
  });

  revalidatePath("/admin/communications/notifications");
  return { deletedCount: result.count, skippedCount: notificationIds.length - result.count };
}

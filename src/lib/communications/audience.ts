import "server-only";
import { prisma } from "@/lib/prisma";
import type { CommunicationAudienceType } from "@/generated/prisma/client";

export interface AudienceSelection {
  audienceType: CommunicationAudienceType;
  selectedCourseIds: string[];
  selectedBundleIds: string[];
  manuallySelectedUserIds: string[];
  excludedUserIds: string[];
}

export interface ResolvedRecipient {
  id: string;
  name: string;
  email: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Single source of truth for resolving a campaign/notification's target
// audience into a deduplicated, valid-email recipient list. Used by both the
// "preview recipients" UI and the actual send/publish path, so what an admin
// previews is exactly who receives it.
export async function resolveAudience(selection: AudienceSelection): Promise<ResolvedRecipient[]> {
  const excluded = new Set(selection.excludedUserIds);
  let users: { id: string; name: string; email: string }[] = [];

  if (selection.audienceType === "ALL_USERS") {
    users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  } else if (selection.audienceType === "ALL_ENROLLED") {
    const enrolled = await prisma.user.findMany({
      where: { enrollments: { some: { status: "ACTIVE" } } },
      select: { id: true, name: true, email: true },
    });
    users = enrolled;
  } else {
    // COURSES / BUNDLES / MANUAL / MIXED all resolve the same way: union of
    // whichever of the three selection sets is populated.
    const byId = new Map<string, { id: string; name: string; email: string }>();

    if (selection.selectedCourseIds.length > 0) {
      const rows = await prisma.enrollment.findMany({
        where: { courseId: { in: selection.selectedCourseIds }, status: "ACTIVE" },
        select: { user: { select: { id: true, name: true, email: true } } },
      });
      for (const r of rows) byId.set(r.user.id, r.user);
    }

    if (selection.selectedBundleIds.length > 0) {
      const rows = await prisma.bundleEnrollment.findMany({
        where: { bundleId: { in: selection.selectedBundleIds }, status: "ACTIVE" },
        select: { user: { select: { id: true, name: true, email: true } } },
      });
      for (const r of rows) byId.set(r.user.id, r.user);
    }

    if (selection.manuallySelectedUserIds.length > 0) {
      const rows = await prisma.user.findMany({
        where: { id: { in: selection.manuallySelectedUserIds } },
        select: { id: true, name: true, email: true },
      });
      for (const r of rows) byId.set(r.id, r);
    }

    users = Array.from(byId.values());
  }

  const seen = new Set<string>();
  const recipients: ResolvedRecipient[] = [];
  for (const u of users) {
    if (excluded.has(u.id)) continue;
    const email = u.email?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({ id: u.id, name: u.name, email: u.email });
  }

  return recipients;
}

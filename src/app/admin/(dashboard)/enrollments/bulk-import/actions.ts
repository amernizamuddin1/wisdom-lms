"use server";

import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { parseCsv, headerIndex, buildCsv } from "@/lib/csv";
import { computeAccess, type DurationChoice } from "@/lib/access";
import { grantBundleAccess } from "@/lib/bundle-access";
import { grantCourseAccess } from "@/lib/entitlements";
import { createUserAccount, ensureTenantMembership } from "@/lib/user-provisioning";
import { sendMail } from "@/lib/email";
import { getBranding } from "@/lib/branding";

// Served as text via a server action rather than a GET route handler — a
// route.ts nested this deep under a dynamic admin segment triggers a
// reproducible webpack build failure on this Next.js version/platform
// (EISDIR on readlink), unrelated to the route's name or content.
export async function downloadEnrollmentCsvTemplate(): Promise<string> {
  await requireAdmin();
  const header = ["full_name", "email", "phone"];
  const sampleRows = [
    ["Jane Doe", "jane.doe@example.com", "+91 9876543210"],
    ["John Smith", "john.smith@example.com", ""],
  ];
  return buildCsv([header, ...sampleRows]);
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DURATION_CHOICES: DurationChoice[] = ["3", "6", "9", "12", "custom", "forever"];

export interface ParsedEnrollmentRow {
  rowNumber: number;
  email: string;
  name: string | null;
  phone: string | null;
  errors: string[];
  alreadyEnrolled: boolean;
  willCreateAccount: boolean;
}

export type ParseEnrollmentCsvState = {
  error?: string;
  csvText?: string;
  targetType?: "COURSE" | "BUNDLE";
  targetId?: string;
  targetLabel?: string;
  rows?: ParsedEnrollmentRow[];
  validCount?: number;
  invalidCount?: number;
  alreadyEnrolledCount?: number;
  newAccountCount?: number;
};

async function parseAndValidate(
  csvText: string,
  targetType: "COURSE" | "BUNDLE",
  targetId: string,
): Promise<
  | { error: string }
  | {
      rows: ParsedEnrollmentRow[];
      validCount: number;
      invalidCount: number;
      alreadyEnrolledCount: number;
      newAccountCount: number;
    }
> {
  const table = parseCsv(csvText);
  if (table.length === 0) return { error: "The file is empty." };

  const idx = headerIndex(table[0]);
  if (!idx.has("email")) return { error: 'Missing required column: "email".' };

  const dataRows = table.slice(1);
  const seenEmails = new Set<string>();
  const parsed: ParsedEnrollmentRow[] = [];

  const get = (row: string[], col: string) => (idx.has(col) ? (row[idx.get(col)!] ?? "").trim() : "");

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2;
    const errors: string[] = [];

    const email = get(row, "email").toLowerCase();
    const fullName = idx.has("full_name") ? get(row, "full_name") || null : null;
    const phone = idx.has("phone") ? get(row, "phone") || null : null;

    if (!email) errors.push("email is required.");
    else if (!EMAIL_RE.test(email)) errors.push(`"${email}" is not a valid email address.`);
    else if (seenEmails.has(email)) errors.push(`Duplicate email "${email}" within this file.`);
    seenEmails.add(email);

    let alreadyEnrolled = false;
    let willCreateAccount = false;
    let resolvedName = fullName;

    if (email && EMAIL_RE.test(email)) {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) {
        willCreateAccount = true;
        if (!fullName) errors.push("full_name is required to create a new account for this learner.");
      } else {
        resolvedName = resolvedName ?? user.name;
        if (targetType === "COURSE") {
          const existing = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId: targetId } },
          });
          alreadyEnrolled = existing?.status === "ACTIVE";
        } else {
          const existing = await prisma.bundleEnrollment.findUnique({
            where: { userId_bundleId: { userId: user.id, bundleId: targetId } },
          });
          alreadyEnrolled = existing?.status === "ACTIVE";
        }
      }
    }

    parsed.push({ rowNumber, email, name: resolvedName, phone, errors, alreadyEnrolled, willCreateAccount });
  }

  const validCount = parsed.filter((r) => r.errors.length === 0).length;
  const invalidCount = parsed.filter((r) => r.errors.length > 0).length;
  const alreadyEnrolledCount = parsed.filter((r) => r.errors.length === 0 && r.alreadyEnrolled).length;
  const newAccountCount = parsed.filter((r) => r.errors.length === 0 && r.willCreateAccount).length;

  return { rows: parsed, validCount, invalidCount, alreadyEnrolledCount, newAccountCount };
}

export async function parseEnrollmentCsv(
  _prevState: ParseEnrollmentCsvState,
  formData: FormData,
): Promise<ParseEnrollmentCsvState> {
  await requireAdmin();

  const targetType = String(formData.get("targetType") ?? "") as "COURSE" | "BUNDLE";
  const targetId = String(formData.get("targetId") ?? "").trim();
  const duration = String(formData.get("duration") ?? "") as DurationChoice;
  const customEndDate = String(formData.get("customEndDate") ?? "").trim();

  if (targetType !== "COURSE" && targetType !== "BUNDLE") return { error: "Select a course or bundle." };
  if (!targetId) return { error: "Select a course or bundle." };
  if (targetType === "COURSE" && !DURATION_CHOICES.includes(duration)) {
    return { error: "Select an access duration." };
  }
  if (targetType === "COURSE" && duration === "custom" && !customEndDate) {
    return { error: "Enter a custom end date." };
  }

  let targetLabel: string;
  if (targetType === "COURSE") {
    const course = await prisma.course.findUnique({ where: { id: targetId }, select: { title: true } });
    if (!course) return { error: "Course not found." };
    targetLabel = course.title;
  } else {
    const bundle = await prisma.courseBundle.findUnique({ where: { id: targetId }, select: { name: true } });
    if (!bundle) return { error: "Bundle not found." };
    targetLabel = bundle.name;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > MAX_FILE_BYTES) return { error: "File is too large (max 2MB)." };
  if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv" && file.type !== "") {
    return { error: "Please upload a .csv file." };
  }

  const csvText = await file.text();
  const result = await parseAndValidate(csvText, targetType, targetId);
  if ("error" in result) return result;

  return { csvText, targetType, targetId, targetLabel, ...result };
}

export type ConfirmEnrollmentImportState = {
  error?: string;
  done?: boolean;
  totalRows?: number;
  successCount?: number;
  skippedCount?: number;
  failureCount?: number;
  newAccountsCreated?: number;
  failures?: { row: number; reason: string }[];
};

export async function confirmEnrollmentImport(
  _prevState: ConfirmEnrollmentImportState,
  formData: FormData,
): Promise<ConfirmEnrollmentImportState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const csvText = String(formData.get("csvText") ?? "");
  const targetType = String(formData.get("targetType") ?? "") as "COURSE" | "BUNDLE";
  const targetId = String(formData.get("targetId") ?? "").trim();
  const duration = String(formData.get("duration") ?? "") as DurationChoice;
  const customEndDate = String(formData.get("customEndDate") ?? "").trim();

  if (!csvText) return { error: "No file to import. Please upload again." };
  if (!targetId) return { error: "Missing course or bundle." };

  // Re-validate from the raw CSV rather than trusting any client-echoed preview
  // data — the only thing carried over the wire between steps is the original text.
  const result = await parseAndValidate(csvText, targetType, targetId);
  if ("error" in result) return { error: result.error };

  let targetLabel: string;
  if (targetType === "COURSE") {
    const course = await prisma.course.findUnique({ where: { id: targetId }, select: { title: true } });
    if (!course) return { error: "Course not found." };
    targetLabel = course.title;
  } else {
    const bundle = await prisma.courseBundle.findUnique({ where: { id: targetId }, select: { name: true } });
    if (!bundle) return { error: "Bundle not found." };
    targetLabel = bundle.name;
  }

  const startAt = new Date();
  let access;
  if (targetType === "COURSE") {
    try {
      access = computeAccess(startAt, duration, customEndDate ? new Date(customEndDate) : null);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not compute the access duration." };
    }
  }

  const branding = await getBranding();

  const failures: { row: number; reason: string }[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let newAccountsCreated = 0;

  for (const row of result.rows) {
    if (row.errors.length > 0) {
      failures.push({ row: row.rowNumber, reason: row.errors.join(" ") });
      continue;
    }
    if (row.alreadyEnrolled) {
      skippedCount++;
      continue;
    }

    try {
      let userId: string;

      const existingUser = await prisma.user.findUnique({ where: { email: row.email } });
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // CSV bulk import never carries passwords — a random one is generated
        // and only ever surfaced via the welcome email, matching the existing
        // findOrCreateUser/self-registration convention.
        const tempPassword = crypto.randomUUID();
        const accountResult = await createUserAccount({
          email: row.email,
          name: row.name ?? row.email,
          password: tempPassword,
          phone: row.phone,
        });
        if (!accountResult.ok) throw new Error(accountResult.error);
        userId = accountResult.userId;
        newAccountsCreated++;

        void sendMail({
          to: row.email,
          subject: "You've been enrolled — set up your account",
          html: `<p>Hi ${row.name ?? ""},</p><p>An account has been created for you on ${branding.platformName}, and you've been enrolled in <strong>${targetLabel}</strong>.</p><p>Your temporary password is: <strong>${tempPassword}</strong></p><p>Log in and change it from your account settings.</p>`,
        });
      }

      // tenantId comes from this admin's own authenticated tenant context (never
      // from the CSV), so this can only ever attach userId to the importing
      // tenant. Idempotent — re-importing the same row never creates a duplicate.
      await ensureTenantMembership(prisma, { tenantId, userId, role: "STUDENT" });

      const user = { id: userId };

      if (targetType === "COURSE") {
        await grantCourseAccess(prisma, {
          userId: user.id,
          courseId: targetId,
          source: "CSV_IMPORT",
          startAt,
          accessEndAt: access!.accessEndAt,
          accessDurationMonths: access!.accessDurationMonths,
          isPermanent: access!.isPermanent,
        });
      } else {
        await prisma.$transaction(async (tx) => {
          await grantBundleAccess(tx, { userId: user.id, bundleId: targetId, startAt });
        });
      }
      successCount++;
    } catch (e) {
      failures.push({ row: row.rowNumber, reason: e instanceof Error ? e.message : "Unknown error." });
    }
  }

  await prisma.importJob.create({
    data: {
      type: "USER_BULK",
      performedById: admin.id,
      courseId: targetType === "COURSE" ? targetId : undefined,
      status: "COMPLETED",
      totalRows: result.rows.length,
      successCount,
      failureCount: failures.length,
      errorsJson: failures,
      tenantId,
    },
  });

  return {
    done: true,
    totalRows: result.rows.length,
    successCount,
    skippedCount,
    failureCount: failures.length,
    newAccountsCreated,
    failures,
  };
}

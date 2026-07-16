"use server";

import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { parseCsv, headerIndex, buildCsv } from "@/lib/csv";
import { computeAccess, type DurationChoice } from "@/lib/access";
import { createUserAccount, ensureTenantMembership } from "@/lib/user-provisioning";
import { grantBundleAccess } from "@/lib/bundle-access";
import { grantCourseAccess } from "@/lib/entitlements";

// Served as text via a server action rather than a GET route handler — a
// route.ts nested this deep under a dynamic admin segment triggers a
// reproducible webpack build failure on this Next.js version/platform
// (EISDIR on readlink), unrelated to the route's name or content.
export async function downloadUserCsvTemplate(): Promise<string> {
  await requireAdmin();
  const header = [
    "full_name",
    "email",
    "phone",
    "role",
    "course_title",
    "bundle_slug",
    "access_duration",
    "access_end_date",
  ];
  const sampleRows = [
    ["Jane Doe", "jane.doe@example.com", "+91 9876543210", "STUDENT", "Intro to Investing", "", "12", ""],
    ["John Smith", "john.smith@example.com", "", "STUDENT", "", "growth-bundle", "forever", ""],
  ];
  return buildCsv([header, ...sampleRows]);
}

const REQUIRED_COLUMNS = ["full_name", "email"];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DURATION_CHOICES = ["3", "6", "9", "12", "forever"];

export interface ParsedUserRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phone: string;
  role: "ADMIN" | "STUDENT";
  courseTitle: string;
  bundleSlug: string;
  accessDuration: string;
  accessEndDate: string;
  errors: string[];
  existsAlready: boolean;
  alreadyMember: boolean;
}

export type ParseUserCsvState = {
  error?: string;
  csvText?: string;
  rows?: ParsedUserRow[];
  validCount?: number;
  invalidCount?: number;
  existingCount?: number;
  alreadyMemberCount?: number;
};

export async function parseUserCsv(
  _prevState: ParseUserCsvState,
  formData: FormData,
): Promise<ParseUserCsvState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large (max 2MB)." };
  }
  if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv" && file.type !== "") {
    return { error: "Please upload a .csv file." };
  }

  const csvText = await file.text();
  const result = await parseAndValidate(csvText, tenantId);
  if ("error" in result) return result;

  return { csvText, ...result };
}

async function parseAndValidate(
  csvText: string,
  tenantId: string,
): Promise<
  | { error: string }
  | {
      rows: ParsedUserRow[];
      validCount: number;
      invalidCount: number;
      existingCount: number;
      alreadyMemberCount: number;
    }
> {
  const table = parseCsv(csvText);
  if (table.length === 0) return { error: "The file is empty." };

  const idx = headerIndex(table[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !idx.has(c));
  if (missing.length > 0) {
    return { error: `Missing required column(s): ${missing.join(", ")}.` };
  }

  const dataRows = table.slice(1);
  const seenEmails = new Set<string>();
  const parsed: ParsedUserRow[] = [];

  const get = (row: string[], col: string) => (idx.has(col) ? (row[idx.get(col)!] ?? "").trim() : "");

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    const errors: string[] = [];

    const fullName = get(row, "full_name");
    const email = get(row, "email").toLowerCase();
    const phone = get(row, "phone");
    const roleRaw = get(row, "role").toUpperCase() || "STUDENT";
    const courseTitle = get(row, "course_title");
    const bundleSlug = get(row, "bundle_slug");
    const accessDuration = get(row, "access_duration");
    const accessEndDate = get(row, "access_end_date");

    if (!fullName) errors.push("full_name is required.");
    if (!email) errors.push("email is required.");
    else if (!EMAIL_RE.test(email)) errors.push(`"${email}" is not a valid email address.`);
    else if (seenEmails.has(email)) errors.push(`Duplicate email "${email}" within this file.`);
    seenEmails.add(email);

    if (roleRaw !== "ADMIN" && roleRaw !== "STUDENT") {
      errors.push(`role "${roleRaw}" must be ADMIN or STUDENT.`);
    }

    if (courseTitle) {
      const matches = await prisma.course.findMany({
        where: { title: { equals: courseTitle, mode: "insensitive" }, status: "PUBLISHED" },
        select: { id: true },
      });
      if (matches.length === 0) errors.push(`No published course titled "${courseTitle}".`);
      else if (matches.length > 1) errors.push(`Multiple published courses titled "${courseTitle}" — ambiguous.`);
    }

    if (bundleSlug) {
      const bundle = await prisma.courseBundle.findFirst({
        where: { slug: bundleSlug, status: "ACTIVE" },
        select: { id: true },
      });
      if (!bundle) errors.push(`No active bundle with slug "${bundleSlug}".`);
    }

    if (accessDuration && !DURATION_CHOICES.includes(accessDuration)) {
      errors.push(`access_duration "${accessDuration}" must be one of 3, 6, 9, 12, forever.`);
    }
    if (accessEndDate && Number.isNaN(new Date(accessEndDate).getTime())) {
      errors.push(`access_end_date "${accessEndDate}" is not a valid date.`);
    }

    let existsAlready = false;
    let alreadyMember = false;
    if (email && EMAIL_RE.test(email)) {
      const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      existsAlready = Boolean(existingUser);
      if (existingUser) {
        const membership = await prisma.tenantMembership.findUnique({
          where: { tenantId_userId: { tenantId, userId: existingUser.id } },
          select: { id: true },
        });
        alreadyMember = Boolean(membership);
      }
    }

    parsed.push({
      rowNumber,
      fullName,
      email,
      phone,
      role: roleRaw === "ADMIN" ? "ADMIN" : "STUDENT",
      courseTitle,
      bundleSlug,
      accessDuration,
      accessEndDate,
      errors,
      existsAlready,
      alreadyMember,
    });
  }

  const validCount = parsed.filter((r) => r.errors.length === 0 && !r.alreadyMember).length;
  const invalidCount = parsed.filter((r) => r.errors.length > 0).length;
  const existingCount = parsed.filter((r) => r.errors.length === 0 && r.existsAlready && !r.alreadyMember).length;
  const alreadyMemberCount = parsed.filter((r) => r.errors.length === 0 && r.alreadyMember).length;

  return { rows: parsed, validCount, invalidCount, existingCount, alreadyMemberCount };
}

export type ConfirmImportState = {
  error?: string;
  done?: boolean;
  totalRows?: number;
  successCount?: number;
  skippedCount?: number;
  failureCount?: number;
  failures?: { row: number; reason: string }[];
};

export async function confirmUserImport(
  _prevState: ConfirmImportState,
  formData: FormData,
): Promise<ConfirmImportState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText) return { error: "No file to import. Please upload again." };

  // Re-validate from the raw CSV rather than trusting any client-echoed preview
  // data — the only thing carried over the wire between steps is the original text.
  const result = await parseAndValidate(csvText, tenantId);
  if ("error" in result) return { error: result.error };

  const failures: { row: number; reason: string }[] = [];
  let successCount = 0;
  let skippedCount = 0;

  for (const row of result.rows) {
    if (row.errors.length > 0) {
      failures.push({ row: row.rowNumber, reason: row.errors.join(" ") });
      continue;
    }
    // Only a true duplicate — this row's user is already a member of this
    // tenant — is skipped. A user who already has a global account but no
    // membership here yet (e.g. they belong to another tenant) still needs
    // to be attached below, with the role/access this row specifies.
    if (row.alreadyMember) {
      skippedCount++;
      continue;
    }

    try {
      // Supabase auth-user creation can't participate in a Postgres transaction,
      // so it happens first, outside the $transaction below — createUserAccount
      // already rolls itself back (deletes the orphaned auth user) if the Prisma
      // User row fails to write. Only the resulting membership/enrollment/bundle
      // grant is wrapped in a DB transaction.
      let userId: string;
      if (row.existsAlready) {
        const existingUser = await prisma.user.findUniqueOrThrow({ where: { email: row.email } });
        userId = existingUser.id;
      } else {
        const password = crypto.randomUUID();
        const accountResult = await createUserAccount({
          email: row.email,
          name: row.fullName,
          password,
          phone: row.phone || null,
          role: row.role,
        });
        if (!accountResult.ok) throw new Error(accountResult.error);
        userId = accountResult.userId;
      }

      await prisma.$transaction(async (tx) => {
        // tenantId is drawn from this admin's own authenticated tenant context
        // (never from the CSV), so this row can only ever attach `userId` to
        // the tenant performing the import.
        await ensureTenantMembership(tx, { tenantId, userId, role: row.role });

        if (row.courseTitle || row.bundleSlug) {
          const startAt = new Date();
          const choice: DurationChoice = row.accessEndDate
            ? "custom"
            : (row.accessDuration as DurationChoice) || "forever";
          const access = computeAccess(startAt, choice, row.accessEndDate ? new Date(row.accessEndDate) : null);

          if (row.courseTitle) {
            const course = await tx.course.findFirstOrThrow({
              where: { title: { equals: row.courseTitle, mode: "insensitive" }, status: "PUBLISHED" },
            });
            await grantCourseAccess(tx, {
              userId,
              courseId: course.id,
              source: "CSV_IMPORT",
              startAt,
              accessEndAt: access.accessEndAt,
              accessDurationMonths: access.accessDurationMonths,
              isPermanent: access.isPermanent,
            });
          }
          if (row.bundleSlug) {
            const bundle = await tx.courseBundle.findFirstOrThrow({
              where: { slug: row.bundleSlug, status: "ACTIVE" },
            });
            await grantBundleAccess(tx, { userId, bundleId: bundle.id, startAt });
          }
        }
      });
      successCount++;
    } catch (e) {
      failures.push({ row: row.rowNumber, reason: e instanceof Error ? e.message : "Unknown error." });
    }
  }

  await prisma.importJob.create({
    data: {
      type: "USER_BULK",
      performedById: admin.id,
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
    failures,
  };
}


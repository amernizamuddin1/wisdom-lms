"use server";

import { requireGroupAccess } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { parseCsv, headerIndex, buildCsv } from "@/lib/csv";
import { computeAccess, type DurationChoice } from "@/lib/access";
import { createUserAccount, ensureTenantMembership, ensureGroupMembership } from "@/lib/user-provisioning";
import { grantCourseAccess } from "@/lib/entitlements";

// Served as text via a server action rather than a GET route handler, matching
// the enrollments/users bulk-import templates — a route.ts this deep under a
// dynamic admin segment triggers a reproducible webpack build failure on this
// Next.js version/platform (EISDIR on readlink), unrelated to route content.
export async function downloadGroupCsvTemplate(groupId: string): Promise<string> {
  await requireGroupAccess(groupId);
  const header = [
    "full_name",
    "email",
    "phone",
    "course_title",
    "register_date",
    "course_progress",
    "lesson",
    "quiz",
  ];
  const sampleRows = [
    ["Jane Doe", "jane.doe@example.com", "+91 9876543210", "Intro to Investing", "01 Jan 2026", "40%", "4/10", "1/2"],
    ["John Smith", "john.smith@example.com", "", "", "", "", "", ""],
  ];
  return buildCsv([header, ...sampleRows]);
}

const REQUIRED_COLUMNS = ["full_name", "email"];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROGRESS_RE = /^(\d{1,3})%$/;
const FRACTION_RE = /^(\d+)\/(\d+)$/;

// Optional columns for migrating enrollment history from a legacy platform —
// see the legacy* snapshot fields on the Enrollment model. Only meaningful
// (and only validated) alongside a course_title on the same row.
interface LegacySnapshot {
  enrolledAt: Date;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  quizzesCompleted: number;
  quizzesTotal: number;
}

export interface ParsedGroupRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phone: string;
  courseTitle: string;
  legacy: LegacySnapshot | null;
  errors: string[];
  existsAlready: boolean;
  alreadyInGroup: boolean;
}

export type ParseGroupCsvState = {
  error?: string;
  csvText?: string;
  rows?: ParsedGroupRow[];
  validCount?: number;
  invalidCount?: number;
  existingCount?: number;
  alreadyInGroupCount?: number;
};

export async function parseGroupCsv(
  groupId: string,
  _prevState: ParseGroupCsvState,
  formData: FormData,
): Promise<ParseGroupCsvState> {
  await requireGroupAccess(groupId);

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
  const result = await parseAndValidate(csvText, groupId);
  if ("error" in result) return result;

  return { csvText, ...result };
}

async function parseAndValidate(
  csvText: string,
  groupId: string,
): Promise<
  | { error: string }
  | {
      rows: ParsedGroupRow[];
      validCount: number;
      invalidCount: number;
      existingCount: number;
      alreadyInGroupCount: number;
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
  const parsed: ParsedGroupRow[] = [];

  const get = (row: string[], col: string) => (idx.has(col) ? (row[idx.get(col)!] ?? "").trim() : "");

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2;
    const errors: string[] = [];

    const fullName = get(row, "full_name");
    const email = get(row, "email").toLowerCase();
    const phone = get(row, "phone");
    const courseTitle = get(row, "course_title");

    if (!fullName) errors.push("full_name is required.");
    if (!email) errors.push("email is required.");
    else if (!EMAIL_RE.test(email)) errors.push(`"${email}" is not a valid email address.`);
    else if (seenEmails.has(email)) errors.push(`Duplicate email "${email}" within this file.`);
    seenEmails.add(email);

    if (courseTitle) {
      const matches = await prisma.course.findMany({
        where: { title: { equals: courseTitle, mode: "insensitive" }, status: "PUBLISHED" },
        select: { id: true },
      });
      if (matches.length === 0) errors.push(`No published course titled "${courseTitle}".`);
      else if (matches.length > 1) errors.push(`Multiple published courses titled "${courseTitle}" — ambiguous.`);
    }

    let legacy: LegacySnapshot | null = null;
    const registerDateRaw = get(row, "register_date");
    const courseProgressRaw = get(row, "course_progress");
    const lessonRaw = get(row, "lesson");
    const quizRaw = get(row, "quiz");
    const hasLegacyColumns = registerDateRaw || courseProgressRaw || lessonRaw || quizRaw;

    if (hasLegacyColumns && !courseTitle) {
      errors.push("register_date/course_progress/lesson/quiz require a course_title on the same row.");
    } else if (hasLegacyColumns && courseTitle) {
      const enrolledAt = new Date(registerDateRaw);
      const progressMatch = PROGRESS_RE.exec(courseProgressRaw);
      const lessonMatch = FRACTION_RE.exec(lessonRaw);
      const quizMatch = FRACTION_RE.exec(quizRaw);

      if (!registerDateRaw || Number.isNaN(enrolledAt.getTime())) {
        errors.push(`register_date "${registerDateRaw}" is not a valid date.`);
      }
      if (!progressMatch || Number(progressMatch[1]) > 100) {
        errors.push(`course_progress "${courseProgressRaw}" must look like "40%" (0-100).`);
      }
      if (!lessonMatch || Number(lessonMatch[1]) > Number(lessonMatch[2])) {
        errors.push(`lesson "${lessonRaw}" must look like "4/10" with completed <= total.`);
      }
      if (!quizMatch || Number(quizMatch[1]) > Number(quizMatch[2])) {
        errors.push(`quiz "${quizRaw}" must look like "1/2" with completed <= total.`);
      }

      if (progressMatch && lessonMatch && quizMatch && !Number.isNaN(enrolledAt.getTime())) {
        legacy = {
          enrolledAt,
          progressPercent: Number(progressMatch[1]),
          lessonsCompleted: Number(lessonMatch[1]),
          lessonsTotal: Number(lessonMatch[2]),
          quizzesCompleted: Number(quizMatch[1]),
          quizzesTotal: Number(quizMatch[2]),
        };
      }
    }

    let existsAlready = false;
    let alreadyInGroup = false;
    if (email && EMAIL_RE.test(email)) {
      const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      existsAlready = Boolean(existingUser);
      if (existingUser) {
        const membership = await prisma.groupMembership.findUnique({
          where: { groupId_userId: { groupId, userId: existingUser.id } },
          select: { id: true },
        });
        alreadyInGroup = Boolean(membership);
      }
    }

    parsed.push({
      rowNumber,
      fullName,
      email,
      phone,
      courseTitle,
      legacy,
      errors,
      existsAlready,
      alreadyInGroup,
    });
  }

  const validCount = parsed.filter((r) => r.errors.length === 0).length;
  const invalidCount = parsed.filter((r) => r.errors.length > 0).length;
  const existingCount = parsed.filter((r) => r.errors.length === 0 && r.existsAlready).length;
  const alreadyInGroupCount = parsed.filter((r) => r.errors.length === 0 && r.alreadyInGroup).length;

  return { rows: parsed, validCount, invalidCount, existingCount, alreadyInGroupCount };
}

export type ConfirmGroupImportState = {
  error?: string;
  done?: boolean;
  totalRows?: number;
  successCount?: number;
  failureCount?: number;
  failures?: { row: number; reason: string }[];
};

export async function confirmGroupImport(
  groupId: string,
  _prevState: ConfirmGroupImportState,
  formData: FormData,
): Promise<ConfirmGroupImportState> {
  const admin = await requireGroupAccess(groupId);
  const tenantId = await getTenantId();

  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText) return { error: "No file to import. Please upload again." };

  // Re-validate from the raw CSV rather than trusting any client-echoed preview
  // data — the only thing carried over the wire between steps is the original text.
  const result = await parseAndValidate(csvText, groupId);
  if ("error" in result) return { error: result.error };

  const failures: { row: number; reason: string }[] = [];
  let successCount = 0;

  for (const row of result.rows) {
    if (row.errors.length > 0) {
      failures.push({ row: row.rowNumber, reason: row.errors.join(" ") });
      continue;
    }

    try {
      // Supabase auth-user creation can't participate in a Postgres transaction,
      // so it happens first, outside the $transaction below — createUserAccount
      // already rolls itself back (deletes the orphaned auth user) if the Prisma
      // User row fails to write.
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
          role: "STUDENT",
        });
        if (!accountResult.ok) throw new Error(accountResult.error);
        userId = accountResult.userId;
      }

      await prisma.$transaction(async (tx) => {
        // tenantId/groupId are drawn from this admin's own authenticated scope
        // (never from the CSV), so this row can only ever attach `userId` to
        // the institution this admin is actually scoped to.
        await ensureTenantMembership(tx, { tenantId, userId, role: "STUDENT" });
        await ensureGroupMembership(tx, { tenantId, groupId, userId });

        if (row.courseTitle) {
          const startAt = new Date();
          const access = computeAccess(startAt, "forever" as DurationChoice, null);
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
            enrolledAt: row.legacy?.enrolledAt,
            legacy: row.legacy
              ? {
                  progressPercent: row.legacy.progressPercent,
                  lessonsCompleted: row.legacy.lessonsCompleted,
                  lessonsTotal: row.legacy.lessonsTotal,
                  quizzesCompleted: row.legacy.quizzesCompleted,
                  quizzesTotal: row.legacy.quizzesTotal,
                }
              : undefined,
          });
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
    failureCount: failures.length,
    failures,
  };
}

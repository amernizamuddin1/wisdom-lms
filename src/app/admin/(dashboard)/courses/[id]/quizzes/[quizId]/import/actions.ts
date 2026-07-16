"use server";

import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { parseCsv, headerIndex, buildCsv } from "@/lib/csv";
import type { QuestionType } from "@/generated/prisma/client";

// Served as text via a server action rather than a GET route handler — see the
// matching comment in ../../../../../users/bulk-import/actions.ts for why.
export async function downloadQuizCsvTemplate(): Promise<string> {
  await requireAdmin();
  const header = [
    "question",
    "question_type",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
    "explanation",
  ];
  const sampleRows = [
    [
      "What is the capital of France?",
      "SINGLE_CHOICE",
      "Paris",
      "London",
      "Berlin",
      "Madrid",
      "A",
      "Paris has been the capital of France since 987 AD.",
    ],
    [
      "Which of these are primary colors?",
      "MULTIPLE_CHOICE",
      "Red",
      "Green",
      "Blue",
      "Orange",
      "A;C",
      "Red and blue are primary colors; green and orange are not.",
    ],
    [
      "The Earth revolves around the Sun.",
      "TRUE_FALSE",
      "",
      "",
      "",
      "",
      "TRUE",
      "This is a basic astronomical fact.",
    ],
  ];
  return buildCsv([header, ...sampleRows]);
}

const REQUIRED_COLUMNS = ["question", "question_type", "correct_answer"];
const VALID_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"];
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export interface ParsedQuestionRow {
  rowNumber: number;
  questionText: string;
  questionType: QuestionType | "";
  options: string[];
  correctOptions: string[];
  explanation: string;
  errors: string[];
}

export type ParseQuizCsvState = {
  error?: string;
  csvText?: string;
  rows?: ParsedQuestionRow[];
  validCount?: number;
  invalidCount?: number;
};

export async function parseQuizCsv(
  quizId: string,
  _prevState: ParseQuizCsvState,
  formData: FormData,
): Promise<ParseQuizCsvState> {
  await requireAdmin();

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return { error: "Quiz not found." };

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
  const result = parseAndValidate(csvText);
  if ("error" in result) return result;

  return { csvText, ...result };
}

function parseAndValidate(
  csvText: string,
): { error: string } | { rows: ParsedQuestionRow[]; validCount: number; invalidCount: number } {
  const table = parseCsv(csvText);
  if (table.length === 0) return { error: "The file is empty." };

  const idx = headerIndex(table[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !idx.has(c));
  if (missing.length > 0) {
    return { error: `Missing required column(s): ${missing.join(", ")}.` };
  }

  const dataRows = table.slice(1);
  const get = (row: string[], col: string) => (idx.has(col) ? (row[idx.get(col)!] ?? "").trim() : "");
  const parsed: ParsedQuestionRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2;
    const errors: string[] = [];

    const questionText = get(row, "question");
    const typeRaw = get(row, "question_type").toUpperCase();
    const optionA = get(row, "option_a");
    const optionB = get(row, "option_b");
    const optionC = get(row, "option_c");
    const optionD = get(row, "option_d");
    const correctAnswerRaw = get(row, "correct_answer");
    const explanation = get(row, "explanation");

    if (!questionText) errors.push("Question text is required.");
    if (!VALID_TYPES.includes(typeRaw)) {
      errors.push(`Question type "${typeRaw}" must be one of ${VALID_TYPES.join(", ")}.`);
    }

    const options = [optionA, optionB, optionC, optionD].filter((o) => o.trim() !== "");
    const optionByLetter: Record<string, string> = { A: optionA, B: optionB, C: optionC, D: optionD };

    let correctOptions: string[] = [];
    const questionType = VALID_TYPES.includes(typeRaw) ? (typeRaw as QuestionType) : "";

    if (questionType === "SINGLE_CHOICE") {
      if (options.length < 2) errors.push("At least two non-empty options are required.");
      const letter = correctAnswerRaw.toUpperCase();
      if (!letter) {
        errors.push("correct_answer is required.");
      } else if (!["A", "B", "C", "D"].includes(letter)) {
        errors.push(`Correct answer "${correctAnswerRaw}" must be one of A, B, C, D.`);
      } else if (!optionByLetter[letter] || optionByLetter[letter].trim() === "") {
        errors.push(`Correct answer "${letter}" is invalid because Option ${letter} is empty.`);
      } else {
        correctOptions = [optionByLetter[letter]];
      }
    } else if (questionType === "MULTIPLE_CHOICE") {
      if (options.length < 2) errors.push("At least two non-empty options are required.");
      const letters = correctAnswerRaw
        .toUpperCase()
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      if (letters.length === 0) {
        errors.push("correct_answer is required (semicolon-separated letters, e.g. A;C).");
      } else {
        for (const letter of letters) {
          if (!["A", "B", "C", "D"].includes(letter)) {
            errors.push(`Correct answer "${letter}" must be one of A, B, C, D.`);
          } else if (!optionByLetter[letter] || optionByLetter[letter].trim() === "") {
            errors.push(`Correct answer "${letter}" is invalid because Option ${letter} is empty.`);
          }
        }
        if (errors.length === 0) {
          correctOptions = letters.map((l) => optionByLetter[l]);
        }
      }
    } else if (questionType === "TRUE_FALSE") {
      const normalized = correctAnswerRaw.trim().toLowerCase();
      if (normalized !== "true" && normalized !== "false") {
        errors.push(`Correct answer "${correctAnswerRaw}" must be TRUE or FALSE.`);
      } else {
        correctOptions = [normalized];
      }
    }

    parsed.push({
      rowNumber,
      questionText,
      questionType,
      options: questionType === "TRUE_FALSE" ? [] : options,
      correctOptions,
      explanation,
      errors,
    });
  }

  const validCount = parsed.filter((r) => r.errors.length === 0).length;
  const invalidCount = parsed.filter((r) => r.errors.length > 0).length;

  return { rows: parsed, validCount, invalidCount };
}

export type ConfirmQuizImportState = {
  error?: string;
  done?: boolean;
  totalRows?: number;
  successCount?: number;
  failureCount?: number;
  failures?: { row: number; reason: string }[];
};

export async function confirmQuizImport(
  quizId: string,
  courseId: string,
  _prevState: ConfirmQuizImportState,
  formData: FormData,
): Promise<ConfirmQuizImportState> {
  const admin = await requireAdmin();
  const tenantId = await getTenantId();

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return { error: "Quiz not found." };

  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText) return { error: "No file to import. Please upload again." };

  const result = parseAndValidate(csvText);
  if ("error" in result) return { error: result.error };

  const failures: { row: number; reason: string }[] = [];
  let successCount = 0;

  const last = await prisma.quizQuestion.findFirst({ where: { quizId }, orderBy: { order: "desc" } });
  let nextOrder = (last?.order ?? -1) + 1;

  for (const row of result.rows) {
    if (row.errors.length > 0) {
      failures.push({ row: row.rowNumber, reason: row.errors.join(" ") });
      continue;
    }

    try {
      await prisma.quizQuestion.create({
        data: {
          quizId,
          questionText: row.questionText,
          questionType: row.questionType as QuestionType,
          optionsJson: row.questionType === "TRUE_FALSE" ? undefined : row.options,
          correctOptionsJson: row.correctOptions,
          explanation: row.explanation || null,
          order: nextOrder++,
          tenantId,
        },
      });
      successCount++;
    } catch (e) {
      failures.push({ row: row.rowNumber, reason: e instanceof Error ? e.message : "Unknown error." });
    }
  }

  await prisma.importJob.create({
    data: {
      type: "QUIZ",
      performedById: admin.id,
      courseId,
      quizId,
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

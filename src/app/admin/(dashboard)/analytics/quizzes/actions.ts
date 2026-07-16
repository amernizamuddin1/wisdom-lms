"use server";

import { requireAdmin } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getQuizPerformanceRows, type QuizFilters } from "@/lib/analytics/quizzes";
import { getQuestionDifficultyRows, getQuestionAttemptDetail, type QuestionAttemptDetail } from "@/lib/analytics/quiz-difficulty";

export type QuizCsvParams = { range?: string; from?: string; to?: string; courseId?: string; quizId?: string };

function toFilters(params: QuizCsvParams): QuizFilters {
  return {
    range: resolveDateRange(params),
    courseId: params.courseId && params.courseId !== "all" ? params.courseId : null,
    quizId: params.quizId && params.quizId !== "all" ? params.quizId : null,
  };
}

export async function exportQuizPerformanceCsv(params: QuizCsvParams): Promise<string> {
  await requireAdmin();
  const rows = await getQuizPerformanceRows(toFilters(params));
  const header = ["Quiz", "Course", "Attempts", "Unique Learners", "Average Score", "Pass Rate (%)", "Failure Rate (%)", "Avg Attempts to Pass"];
  const csvRows = rows.map((r) => [
    r.quizTitle,
    r.courseTitle,
    String(r.attempts),
    String(r.uniqueLearners),
    r.averageScore === null ? "" : String(r.averageScore),
    String(r.passRate),
    String(r.failureRate),
    r.averageAttemptsToPass === null ? "" : String(r.averageAttemptsToPass),
  ]);
  return buildCsv([header, ...csvRows]);
}

export async function exportQuestionDifficultyCsv(params: QuizCsvParams): Promise<string> {
  await requireAdmin();
  const rows = await getQuestionDifficultyRows(toFilters(params));
  const header = ["Question", "Quiz", "Attempts", "Correct", "Incorrect", "Correct %", "Difficulty"];
  const csvRows = rows.map((r) => [
    r.questionPreview,
    r.quizTitle,
    String(r.attempts),
    String(r.correct),
    String(r.incorrect),
    String(r.correctPercent),
    r.difficulty,
  ]);
  return buildCsv([header, ...csvRows]);
}

export async function fetchQuestionAttemptDetail(questionId: string): Promise<QuestionAttemptDetail | null> {
  await requireAdmin();
  return getQuestionAttemptDetail(questionId);
}

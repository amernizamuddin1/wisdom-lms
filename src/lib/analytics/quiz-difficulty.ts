import "server-only";
import { prisma } from "@/lib/prisma";
import { classifyQuestionDifficulty, type QuizDifficulty } from "./definitions";
import type { QuizFilters } from "./quizzes";
import { ANALYTICS_ROW_CAP } from "./shared";

export type QuestionDifficultyRow = {
  questionId: string;
  questionPreview: string;
  quizId: string;
  quizTitle: string;
  attempts: number;
  correct: number;
  incorrect: number;
  correctPercent: number;
  difficulty: QuizDifficulty;
};

function preview(text: string, maxLen = 80): string {
  return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
}

export async function getQuestionDifficultyRows(filters: QuizFilters): Promise<QuestionDifficultyRow[]> {
  const attemptWhere = filters.quizId
    ? { quizId: filters.quizId, attemptedAt: { gte: filters.range.from, lte: filters.range.to } }
    : filters.courseId
      ? {
          attemptedAt: { gte: filters.range.from, lte: filters.range.to },
          OR: [{ quiz: { courseId: filters.courseId } }, { quiz: { chapter: { courseId: filters.courseId } } }],
        }
      : { attemptedAt: { gte: filters.range.from, lte: filters.range.to } };

  const attempts = await prisma.quizAttempt.findMany({
    where: attemptWhere,
    select: { id: true },
    take: ANALYTICS_ROW_CAP,
  });
  if (attempts.length === 0) return [];

  // Bounded to the same row cap as the attempts fetch above — without this, a
  // busy quiz/date-range with many questions per attempt could pull well past
  // 100k answer rows into JS for a single page render.
  const answers = await prisma.quizAttemptAnswer.findMany({
    where: { attemptId: { in: attempts.map((a) => a.id) } },
    select: {
      questionId: true,
      isCorrect: true,
      question: { select: { questionText: true, quizId: true, quiz: { select: { title: true } } } },
    },
    take: ANALYTICS_ROW_CAP,
  });

  const byQuestion = new Map<string, { correct: number; incorrect: number; text: string; quizId: string; quizTitle: string }>();
  for (const answer of answers) {
    const entry = byQuestion.get(answer.questionId) ?? {
      correct: 0,
      incorrect: 0,
      text: answer.question.questionText,
      quizId: answer.question.quizId,
      quizTitle: answer.question.quiz.title,
    };
    if (answer.isCorrect) entry.correct += 1;
    else entry.incorrect += 1;
    byQuestion.set(answer.questionId, entry);
  }

  return [...byQuestion.entries()].map(([questionId, entry]) => {
    const total = entry.correct + entry.incorrect;
    const correctPercent = total === 0 ? 0 : Math.round((entry.correct / total) * 1000) / 10;
    return {
      questionId,
      questionPreview: preview(entry.text),
      quizId: entry.quizId,
      quizTitle: entry.quizTitle,
      attempts: total,
      correct: entry.correct,
      incorrect: entry.incorrect,
      correctPercent,
      difficulty: classifyQuestionDifficulty(correctPercent),
    };
  });
}

export type QuestionAttemptDetail = {
  optionsJson: unknown;
  correctOptionsJson: unknown;
  correctAnswerText: string | null;
  answers: { givenOptionsJson: unknown; givenAnswerText: string | null; isCorrect: boolean; attemptedAt: Date; learnerName: string }[];
};

export async function getQuestionAttemptDetail(questionId: string): Promise<QuestionAttemptDetail | null> {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { optionsJson: true, correctOptionsJson: true, correctAnswerText: true },
  });
  if (!question) return null;

  const answers = await prisma.quizAttemptAnswer.findMany({
    where: { questionId },
    select: {
      givenOptionsJson: true,
      givenAnswerText: true,
      isCorrect: true,
      attempt: { select: { attemptedAt: true, user: { select: { name: true } } } },
    },
    orderBy: { attempt: { attemptedAt: "desc" } },
    take: 200,
  });

  return {
    optionsJson: question.optionsJson,
    correctOptionsJson: question.correctOptionsJson,
    correctAnswerText: question.correctAnswerText,
    answers: answers.map((a) => ({
      givenOptionsJson: a.givenOptionsJson,
      givenAnswerText: a.givenAnswerText,
      isCorrect: a.isCorrect,
      attemptedAt: a.attempt.attemptedAt,
      learnerName: a.attempt.user.name,
    })),
  };
}

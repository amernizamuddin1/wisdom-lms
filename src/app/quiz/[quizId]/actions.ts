"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAnswer, type GivenAnswer } from "@/lib/grading";
import { Prisma } from "@/generated/prisma/client";
import { recordQuizAttempt } from "@/lib/gamification/events";
import { getTenantId } from "@/lib/tenant-context";

export async function submitQuizAttempt(quizId: string, formData: FormData) {
  const user = await requireUser();
  const tenantId = await getTenantId();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      chapter: { select: { courseId: true } },
    },
  });

  if (!quiz) throw new Error("Quiz not found");

  const answerRecords = quiz.questions.map((question) => {
    let given: GivenAnswer;

    if (question.questionType === "MULTIPLE_CHOICE") {
      const options = formData.getAll(`q_${question.id}_options`).map(String);
      given = { options, answerText: null };
    } else if (question.questionType === "FILL_BLANK") {
      const text = String(formData.get(`q_${question.id}_text`) ?? "").trim();
      given = { options: null, answerText: text || null };
    } else {
      const option = String(formData.get(`q_${question.id}_option`) ?? "").trim();
      given = { options: option ? [option] : null, answerText: null };
    }

    const isCorrect = gradeAnswer(
      {
        questionType: question.questionType,
        correctOptions: question.correctOptionsJson as string[] | null,
        correctAnswerText: question.correctAnswerText,
      },
      given,
    );

    return { questionId: question.id, given, isCorrect };
  });

  const correctCount = answerRecords.filter((a) => a.isCorrect).length;
  const score =
    quiz.questions.length > 0 ? Math.round((correctCount / quiz.questions.length) * 100) : 0;
  const passed = score >= quiz.passPercentage;

  const courseId = quiz.courseId ?? quiz.chapter?.courseId;

  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.quizAttempt.create({
      data: { tenantId, userId: user.id, quizId, score, passed },
    });

    await tx.quizAttemptAnswer.createMany({
      data: answerRecords.map((a) => ({
        tenantId,
        attemptId: created.id,
        questionId: a.questionId,
        givenOptionsJson: a.given.options ?? Prisma.JsonNull,
        givenAnswerText: a.given.answerText,
        isCorrect: a.isCorrect,
      })),
    });

    if (courseId) {
      await recordQuizAttempt(tx, {
        userId: user.id,
        courseId,
        chapterId: quiz.chapterId,
        quizId,
        attemptId: created.id,
        score,
        passed,
      });
    }

    return created;
  });

  redirect(`/quiz/${quizId}/results/${attempt.id}`);
}

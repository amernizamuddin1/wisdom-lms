"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { invalidatePublicCourseCache } from "@/lib/public-cache";
import { requireAdmin } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { Prisma, type QuestionType } from "@/generated/prisma/client";

export type ActionState = { error?: string; success?: boolean };
export type QuestionData = {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: string[] | null;
  correctOptions: string[] | null;
  correctAnswerText: string | null;
  explanation: string | null;
};
export type QuestionActionState = {
  error?: string;
  question?: QuestionData;
};

export async function createQuiz(
  courseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const title = String(formData.get("title") ?? "").trim();
  const passPercentage = Number(formData.get("passPercentage"));
  const scope = String(formData.get("scope") ?? "course");
  const chapterId = String(formData.get("chapterId") ?? "").trim();
  const timeLimitRaw = String(formData.get("timeLimitMinutes") ?? "").trim();
  const timeLimitMinutes = timeLimitRaw ? Number(timeLimitRaw) : null;

  if (!title) return { error: "Title is required." };
  if (!Number.isFinite(passPercentage) || passPercentage < 0 || passPercentage > 100) {
    return { error: "Pass percentage must be between 0 and 100." };
  }
  if (scope === "chapter" && !chapterId) {
    return { error: "Choose a chapter." };
  }
  if (timeLimitMinutes !== null && (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes <= 0)) {
    return { error: "Time limit must be a positive number of minutes." };
  }

  const quiz = await prisma.quiz.create({
    data: {
      title,
      passPercentage,
      timeLimitMinutes,
      courseId: scope === "course" ? courseId : null,
      chapterId: scope === "chapter" ? chapterId : null,
      tenantId,
    },
  });

  await invalidatePublicCourseCache();
  redirect(`/admin/courses/${courseId}/quizzes/${quiz.id}`);
}

export async function updateQuiz(
  courseId: string,
  quizId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const passPercentage = Number(formData.get("passPercentage"));
  const timeLimitRaw = String(formData.get("timeLimitMinutes") ?? "").trim();
  const timeLimitMinutes = timeLimitRaw ? Number(timeLimitRaw) : null;

  if (!title) return { error: "Title is required." };
  if (!Number.isFinite(passPercentage) || passPercentage < 0 || passPercentage > 100) {
    return { error: "Pass percentage must be between 0 and 100." };
  }
  if (timeLimitMinutes !== null && (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes <= 0)) {
    return { error: "Time limit must be a positive number of minutes." };
  }

  await prisma.quiz.update({
    where: { id: quizId },
    data: { title, passPercentage, timeLimitMinutes },
  });

  await invalidatePublicCourseCache();
  revalidatePath(`/admin/courses/${courseId}/quizzes/${quizId}`);
  return { success: true };
}

export async function deleteQuiz(courseId: string, quizId: string) {
  await requireAdmin();
  await prisma.quiz.delete({ where: { id: quizId } });
  await invalidatePublicCourseCache();
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

export async function upsertQuestion(
  courseId: string,
  quizId: string,
  _prevState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  await requireAdmin();
  const tenantId = await getTenantId();

  const questionId = String(formData.get("questionId") ?? "").trim();
  const questionText = String(formData.get("questionText") ?? "").trim();
  const questionType = String(formData.get("questionType") ?? "SINGLE_CHOICE") as QuestionType;
  const explanation = String(formData.get("explanation") ?? "").trim() || null;

  if (!questionText) return { error: "Question text is required." };

  let optionsJson: string[] | null = null;
  let correctOptionsJson: string[] | null = null;
  let correctAnswerText: string | null = null;

  if (questionType === "SINGLE_CHOICE") {
    const options = formData
      .getAll("options")
      .map((o) => String(o).trim())
      .filter(Boolean);
    const correctOption = String(formData.get("correctOption") ?? "").trim();

    if (options.length < 2) return { error: "Add at least two options." };
    if (!options.includes(correctOption)) {
      return { error: "Correct option must match one of the options." };
    }

    optionsJson = options;
    correctOptionsJson = [correctOption];
  } else if (questionType === "MULTIPLE_CHOICE") {
    const options = formData
      .getAll("options")
      .map((o) => String(o).trim())
      .filter(Boolean);
    const correctOptions = formData
      .getAll("correctOptions")
      .map((o) => String(o).trim())
      .filter(Boolean);

    if (options.length < 2) return { error: "Add at least two options." };
    if (correctOptions.length < 1) return { error: "Select at least one correct option." };
    if (!correctOptions.every((c) => options.includes(c))) {
      return { error: "Correct options must match the option list." };
    }

    optionsJson = options;
    correctOptionsJson = correctOptions;
  } else if (questionType === "TRUE_FALSE") {
    const correctOption = String(formData.get("correctOption") ?? "").trim();

    if (correctOption !== "true" && correctOption !== "false") {
      return { error: "Select True or False." };
    }

    correctOptionsJson = [correctOption];
  } else if (questionType === "FILL_BLANK") {
    const answer = String(formData.get("correctAnswerText") ?? "").trim();

    if (!answer) return { error: "Enter the accepted answer." };

    correctAnswerText = answer;
  }

  const data = {
    questionText,
    questionType,
    optionsJson: optionsJson === null ? Prisma.JsonNull : optionsJson,
    correctOptionsJson: correctOptionsJson === null ? Prisma.JsonNull : correctOptionsJson,
    correctAnswerText,
    explanation,
  };

  let saved;
  if (questionId) {
    saved = await prisma.quizQuestion.update({
      where: { id: questionId, quizId },
      data,
    });
  } else {
    const last = await prisma.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { order: "desc" },
    });
    saved = await prisma.quizQuestion.create({
      data: { ...data, quizId, order: (last?.order ?? -1) + 1, tenantId },
    });
  }

  revalidatePath(`/admin/courses/${courseId}/quizzes/${quizId}`);
  return {
    question: {
      id: saved.id,
      questionText: saved.questionText,
      questionType: saved.questionType,
      options: saved.optionsJson as string[] | null,
      correctOptions: saved.correctOptionsJson as string[] | null,
      correctAnswerText: saved.correctAnswerText,
      explanation: saved.explanation,
    },
  };
}

export async function deleteQuestion(courseId: string, quizId: string, questionId: string) {
  await requireAdmin();
  await prisma.quizQuestion.delete({ where: { id: questionId, quizId } });
  revalidatePath(`/admin/courses/${courseId}/quizzes/${quizId}`);
}

export async function reorderQuestions(
  courseId: string,
  quizId: string,
  orderedIds: string[],
) {
  await requireAdmin();

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.quizQuestion.update({
        where: { id, quizId },
        data: { order: index },
      }),
    ),
  );

  revalidatePath(`/admin/courses/${courseId}/quizzes/${quizId}`);
}

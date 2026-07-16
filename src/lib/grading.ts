import type { QuestionType } from "@/generated/prisma/client";

export type GradableQuestion = {
  questionType: QuestionType;
  correctOptions: string[] | null;
  correctAnswerText: string | null;
};

export type GivenAnswer = {
  options: string[] | null;
  answerText: string | null;
};

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function gradeAnswer(question: GradableQuestion, given: GivenAnswer): boolean {
  switch (question.questionType) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE": {
      const correct = question.correctOptions?.[0];
      const givenOption = given.options?.[0];
      return Boolean(correct) && givenOption === correct;
    }
    case "MULTIPLE_CHOICE": {
      const correctSet = new Set(question.correctOptions ?? []);
      const givenSet = new Set(given.options ?? []);
      if (correctSet.size === 0 || correctSet.size !== givenSet.size) return false;
      for (const option of correctSet) {
        if (!givenSet.has(option)) return false;
      }
      return true;
    }
    case "FILL_BLANK": {
      const correct = question.correctAnswerText;
      const givenText = given.answerText;
      if (!correct || !givenText) return false;
      return normalizeText(correct) === normalizeText(givenText);
    }
  }
}

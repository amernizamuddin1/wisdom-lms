import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitQuizAttempt } from "./actions";
import QuizRunner from "./QuizRunner";

export default async function QuizTakingPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  await requireUser();
  const { quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!quiz) notFound();

  const action = submitQuizAttempt.bind(null, quizId);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <QuizRunner
        title={quiz.title}
        passPercentage={quiz.passPercentage}
        timeLimitMinutes={quiz.timeLimitMinutes}
        questions={quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          optionsJson: q.optionsJson,
        }))}
        action={action}
      />
    </div>
  );
}

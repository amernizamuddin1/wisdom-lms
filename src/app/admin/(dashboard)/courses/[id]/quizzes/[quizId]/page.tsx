import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import QuizDetailsForm from "./QuizDetailsForm";
import QuestionsSection from "./QuestionsSection";

export default async function QuizEditorPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  await requireAdmin();
  const { id, quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!quiz) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{quiz.title}</h2>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/courses/${id}/quizzes/${quiz.id}/import`}>Import CSV</Link>
        </Button>
      </div>

      <QuizDetailsForm
        courseId={id}
        quizId={quiz.id}
        title={quiz.title}
        passPercentage={quiz.passPercentage}
        timeLimitMinutes={quiz.timeLimitMinutes}
      />

      <QuestionsSection
        courseId={id}
        quizId={quiz.id}
        initialQuestions={quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.optionsJson as string[] | null,
          correctOptions: q.correctOptionsJson as string[] | null,
          correctAnswerText: q.correctAnswerText,
          explanation: q.explanation,
        }))}
      />
    </div>
  );
}

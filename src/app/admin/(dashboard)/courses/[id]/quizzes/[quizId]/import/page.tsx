import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QuizImportWizard from "./QuizImportWizard";

export default async function QuizImportPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  await requireAdmin();
  const { id, quizId } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Import Quiz Questions</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV of questions for &ldquo;{quiz.title}&rdquo;.
        </p>
      </div>
      <QuizImportWizard courseId={id} quizId={quizId} />
    </div>
  );
}

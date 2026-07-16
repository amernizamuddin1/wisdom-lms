import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function QuizResultsPage({
  params,
}: {
  params: Promise<{ quizId: string; attemptId: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { chapter: true } },
      answers: {
        include: { question: true },
      },
    },
  });

  if (!attempt || attempt.userId !== user.id) notFound();

  const orderedAnswers = [...attempt.answers].sort(
    (a, b) => a.question.order - b.question.order,
  );

  const courseId = attempt.quiz.courseId ?? attempt.quiz.chapter?.courseId ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-foreground">{attempt.quiz.title} — Results</h1>

      <Card
        className={cn(
          "border",
          attempt.passed
            ? "border-success/30 bg-success/10"
            : "border-destructive/30 bg-destructive/10",
        )}
      >
        <CardContent>
          <p
            className={cn(
              "text-lg font-semibold",
              attempt.passed ? "text-success" : "text-destructive",
            )}
          >
            {attempt.score}% — {attempt.passed ? "Pass" : "Fail"}
          </p>
          <p className="text-sm text-muted-foreground">
            Minimum passing score: {attempt.quiz.passPercentage}%
          </p>
        </CardContent>
      </Card>

      {courseId && (
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Back to course
        </Link>
      )}

      <div className="space-y-4">
        {orderedAnswers.map((answer, index) => {
          const question = answer.question;
          const given = answer.givenOptionsJson as string[] | null;

          return (
            <Card key={answer.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {index + 1}. {question.questionText}
                  </p>
                  <Badge
                    variant={answer.isCorrect ? "success" : "destructive"}
                    className="shrink-0"
                  >
                    {answer.isCorrect ? "Correct" : "Incorrect"}
                  </Badge>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  Your answer:{" "}
                  <span className="font-medium text-foreground">
                    {question.questionType === "FILL_BLANK"
                      ? (answer.givenAnswerText ?? "—")
                      : question.questionType === "TRUE_FALSE"
                        ? given?.[0] === "true"
                          ? "True"
                          : "False"
                        : (given?.join(", ") ?? "—")}
                  </span>
                </p>

                {question.explanation && (
                  <p className="mt-2 rounded-md bg-muted p-2 text-sm text-foreground">
                    {question.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

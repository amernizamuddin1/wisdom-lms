"use client";

import { useEffect, useRef, useState } from "react";
import { ClockIcon, FileQuestionIcon, TargetIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Question = {
  id: string;
  questionText: string;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";
  optionsJson: unknown;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizRunner({
  title,
  passPercentage,
  timeLimitMinutes,
  questions,
  action,
}: {
  title: string;
  passPercentage: number;
  timeLimitMinutes: number | null;
  questions: Question[];
  action: (formData: FormData) => void;
}) {
  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState((timeLimitMinutes ?? 0) * 60);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!started || !timeLimitMinutes) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          formRef.current?.requestSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [started, timeLimitMinutes]);

  if (!started) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/50 p-4 text-center">
              <FileQuestionIcon className="size-5 text-primary" />
              <span className="text-lg font-semibold text-foreground">{questions.length}</span>
              <span className="text-xs text-muted-foreground">Questions</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/50 p-4 text-center">
              <TargetIcon className="size-5 text-primary" />
              <span className="text-lg font-semibold text-foreground">{passPercentage}%</span>
              <span className="text-xs text-muted-foreground">To pass</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/50 p-4 text-center">
              <ClockIcon className="size-5 text-primary" />
              <span className="text-lg font-semibold text-foreground">
                {timeLimitMinutes ? `${timeLimitMinutes} min` : "No limit"}
              </span>
              <span className="text-xs text-muted-foreground">Time</span>
            </div>
          </div>

          {timeLimitMinutes && (
            <p className="text-sm text-muted-foreground">
              Once you start, you&rsquo;ll have {timeLimitMinutes} minute
              {timeLimitMinutes === 1 ? "" : "s"} to finish. The quiz submits automatically when
              time runs out.
            </p>
          )}

          <Button onClick={() => setStarted(true)} className="w-full" size="lg">
            Start Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {timeLimitMinutes && (
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium tabular-nums ${
              secondsLeft <= 60
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-muted text-foreground"
            }`}
          >
            <ClockIcon className="size-4" />
            {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      <form ref={formRef} action={action} className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent>
              <p className="font-medium text-foreground">
                {index + 1}. {question.questionText}
              </p>

              <div className="mt-3 space-y-2">
                {question.questionType === "SINGLE_CHOICE" && (
                  <RadioGroup name={`q_${question.id}_option`}>
                    {(question.optionsJson as string[]).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-foreground">
                        <RadioGroupItem value={opt} />
                        {opt}
                      </label>
                    ))}
                  </RadioGroup>
                )}

                {question.questionType === "MULTIPLE_CHOICE" &&
                  (question.optionsJson as string[]).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox name={`q_${question.id}_options`} value={opt} />
                      {opt}
                    </label>
                  ))}

                {question.questionType === "TRUE_FALSE" && (
                  <RadioGroup name={`q_${question.id}_option`}>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <RadioGroupItem value="true" />
                      True
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <RadioGroupItem value="false" />
                      False
                    </label>
                  </RadioGroup>
                )}

                {question.questionType === "FILL_BLANK" && (
                  <Input type="text" name={`q_${question.id}_text`} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="submit" size="lg">
          Submit Quiz
        </Button>
      </form>
    </div>
  );
}

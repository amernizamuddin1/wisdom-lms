"use client";

import { useActionState, useTransition } from "react";
import { updateQuiz, deleteQuiz, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function QuizDetailsForm({
  courseId,
  quizId,
  title,
  passPercentage,
  timeLimitMinutes,
}: {
  courseId: string;
  quizId: string;
  title: string;
  passPercentage: number;
  timeLimitMinutes: number | null;
}) {
  const action = updateQuiz.bind(null, courseId, quizId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Quiz saved.");
  const [deleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this quiz and all its questions?")) return;
    startDeleteTransition(() => {
      deleteQuiz(courseId, quizId);
    });
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Quiz Details</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Delete Quiz
        </Button>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={title} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="passPercentage">Minimum pass percentage</Label>
              <Input
                id="passPercentage"
                name="passPercentage"
                type="number"
                min="0"
                max="100"
                defaultValue={passPercentage}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="timeLimitMinutes">Time limit (minutes, optional)</Label>
              <Input
                id="timeLimitMinutes"
                name="timeLimitMinutes"
                type="number"
                min="1"
                defaultValue={timeLimitMinutes ?? ""}
                placeholder="No limit"
              />
              <p className="text-xs text-muted-foreground">Leave blank for an untimed quiz.</p>
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

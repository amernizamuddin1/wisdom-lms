"use client";

import { useActionState, useState } from "react";
import { createQuiz, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function NewQuizForm({
  courseId,
  chapters,
  defaultChapterId,
}: {
  courseId: string;
  chapters: { id: string; title: string }[];
  defaultChapterId?: string;
}) {
  const action = createQuiz.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Quiz created.");
  const [scope, setScope] = useState<"course" | "chapter">(
    defaultChapterId ? "chapter" : "course",
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>

        <div className="space-y-1">
          <Label htmlFor="passPercentage">Minimum pass percentage</Label>
          <Input
            id="passPercentage"
            name="passPercentage"
            type="number"
            min="0"
            max="100"
            defaultValue={70}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="timeLimitMinutes">Time limit (minutes, optional)</Label>
          <Input id="timeLimitMinutes" name="timeLimitMinutes" type="number" min="1" placeholder="No limit" />
          <p className="text-xs text-muted-foreground">
            Leave blank for an untimed quiz.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Applies to</legend>
        <input type="hidden" name="scope" value={scope} />
        <RadioGroup value={scope} onValueChange={(value) => setScope(value as "course" | "chapter")}>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <RadioGroupItem value="course" />
            The whole course
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <RadioGroupItem value="chapter" />
            A specific chapter
          </label>
        </RadioGroup>
        {scope === "chapter" && (
          <select
            name="chapterId"
            defaultValue={defaultChapterId ?? ""}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="" disabled>
              Choose a chapter
            </option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </fieldset>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Quiz"}
      </Button>
    </form>
  );
}

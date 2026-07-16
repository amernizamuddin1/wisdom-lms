"use client";

import { useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { markLessonComplete } from "./actions";
import { Button } from "@/components/ui/button";

export default function MarkCompleteButton({
  courseId,
  lessonId,
  completed,
  label = "Mark as Complete",
  completedLabel = "Completed",
  variant = "default",
}: {
  courseId: string;
  lessonId: string;
  completed: boolean;
  label?: string;
  completedLabel?: string;
  variant?: "default" | "success";
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      markLessonComplete(courseId, lessonId);
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={completed || pending}
      variant={completed ? "secondary" : variant}
    >
      {completed && <CheckIcon />}
      {completed ? completedLabel : pending ? "Saving..." : label}
    </Button>
  );
}

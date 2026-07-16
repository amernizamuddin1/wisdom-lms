"use client";

import { useTransition } from "react";
import { duplicateCourse } from "./actions";
import { Button } from "@/components/ui/button";

export default function DuplicateCourseButton({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(() => {
      duplicateCourse(courseId);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={pending}>
      {pending ? "Duplicating..." : "Duplicate"}
    </Button>
  );
}

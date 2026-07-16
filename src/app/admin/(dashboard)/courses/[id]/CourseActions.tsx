"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setCourseStatus, setCourseLearningStatus, deleteCourse, duplicateCourse } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CourseActions({
  courseId,
  status,
  learningStatus,
}: {
  courseId: string;
  status: "DRAFT" | "PUBLISHED";
  learningStatus: "ACTIVE" | "PAUSED";
}) {
  const [pending, startTransition] = useTransition();

  function toggleStatus() {
    const next = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    startTransition(async () => {
      await setCourseStatus(courseId, next);
      toast.success(next === "PUBLISHED" ? "Course published." : "Course unpublished.");
    });
  }

  function toggleLearningStatus() {
    const next = learningStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      await setCourseLearningStatus(courseId, next);
      toast.success(next === "ACTIVE" ? "Course resumed." : "Course paused.");
    });
  }

  function handleDelete() {
    if (!confirm("Delete this course and everything in it? This cannot be undone.")) return;
    startTransition(() => {
      deleteCourse(courseId);
    });
  }

  function handleDuplicate() {
    startTransition(() => {
      duplicateCourse(courseId);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={learningStatus === "ACTIVE" ? "success" : "secondary"}>
          {learningStatus === "ACTIVE" ? "Active" : "Paused"}
        </Badge>
        <Button variant="outline" size="sm" onClick={toggleLearningStatus} disabled={pending}>
          {learningStatus === "ACTIVE" ? "Pause Course" : "Resume Course"}
        </Button>
      </div>
      <Button variant="outline" onClick={toggleStatus} disabled={pending}>
        {status === "PUBLISHED" ? "Unpublish" : "Publish"}
      </Button>
      <Button variant="outline" onClick={handleDuplicate} disabled={pending}>
        {pending ? "Duplicating..." : "Duplicate Course"}
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={pending}>
        Delete Course
      </Button>
    </div>
  );
}

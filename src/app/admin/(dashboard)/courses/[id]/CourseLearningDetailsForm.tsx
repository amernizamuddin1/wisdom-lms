"use client";

import { useActionState } from "react";
import { updateCourseLearningDetails, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrayListInput } from "@/components/admin/ArrayListInput";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export function CourseLearningDetailsForm({
  courseId,
  prerequisites,
  learningObjectives,
  outcomes,
  materialsIncluded,
  targetAudience,
}: {
  courseId: string;
  prerequisites: string[];
  learningObjectives: string[];
  outcomes: string[];
  materialsIncluded: string[];
  targetAudience: string[];
}) {
  const action = updateCourseLearningDetails.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Learning details saved.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <ArrayListInput
            name="learningObjectives"
            label="What you'll learn"
            initialValues={learningObjectives}
            placeholder="e.g. Understand the core concepts"
          />
          <ArrayListInput
            name="outcomes"
            label="After completing this course"
            initialValues={outcomes}
            placeholder="e.g. Build a production-ready application"
            helperText="Optional. Shown only if you add items."
          />
          <ArrayListInput
            name="prerequisites"
            label="Requirements"
            initialValues={prerequisites}
            placeholder="e.g. Basic computer knowledge"
          />
          <ArrayListInput
            name="materialsIncluded"
            label="Materials included"
            initialValues={materialsIncluded}
            placeholder="e.g. 10 hours of on-demand video"
          />
          <ArrayListInput
            name="targetAudience"
            label="Target audience"
            initialValues={targetAudience}
            placeholder="e.g. Working professionals"
          />

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Learning Details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

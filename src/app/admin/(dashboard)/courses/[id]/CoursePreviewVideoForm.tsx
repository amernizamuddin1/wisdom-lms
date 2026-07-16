"use client";

import { useActionState } from "react";
import { updateCoursePreviewVideo, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export function CoursePreviewVideoForm({
  courseId,
  previewVideoUrl,
}: {
  courseId: string;
  previewVideoUrl: string;
}) {
  const action = updateCoursePreviewVideo.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Preview video saved.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview Video</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="previewVideoUrl">YouTube or Vimeo URL</Label>
            <Input
              id="previewVideoUrl"
              name="previewVideoUrl"
              defaultValue={previewVideoUrl}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              Shown at the top of the course page instead of the thumbnail. Leave blank to show
              the thumbnail only.
            </p>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Preview Video"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

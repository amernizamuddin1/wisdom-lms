"use client";

import { useActionState } from "react";
import { updateCourseLaunchDate, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export function CourseLaunchDateForm({
  courseId,
  launchDate,
}: {
  courseId: string;
  launchDate: string;
}) {
  const action = updateCourseLaunchDate.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Launch date saved.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Launch Date</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="launchDate">Course launch date</Label>
            <Input id="launchDate" name="launchDate" type="date" defaultValue={launchDate} />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </form>
        {state.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}

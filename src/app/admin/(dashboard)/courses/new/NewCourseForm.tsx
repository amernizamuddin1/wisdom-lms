"use client";

import { useActionState, useState } from "react";
import { createCourse, type ActionState } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function NewCourseForm() {
  const [state, formAction, pending] = useActionState(createCourse, initialState);
  useActionToast(state, "Course created.");
  const [isFree, setIsFree] = useState(false);

  return (
    <Card className="max-w-3xl">
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" name="tags" placeholder="e.g. python, backend, beginner" />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Used for search, filtering, and SEO.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea
              id="shortDescription"
              name="shortDescription"
              rows={2}
              placeholder="A one-line summary shown on course cards and previews"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              name="isFree"
              checked={isFree}
              onCheckedChange={(checked) => setIsFree(checked === true)}
            />
            This course is free
          </label>

          <p className="text-xs text-muted-foreground">
            Learning details, curriculum, instructor, media, and access settings can be configured
            after the course is created.
          </p>

          {!isFree && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="priceInr">Price (INR)</Label>
                <Input id="priceInr" name="priceInr" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priceUsd">Price (USD)</Label>
                <Input id="priceUsd" name="priceUsd" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priceEur">Price (EUR, optional)</Label>
                <Input id="priceEur" name="priceEur" type="number" min="0" step="0.01" />
              </div>
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Course"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

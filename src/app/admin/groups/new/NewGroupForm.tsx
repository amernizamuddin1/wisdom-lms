"use client";

import { useActionState, useState } from "react";
import { createGroup, type ActionState } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewGroupForm() {
  const [state, formAction, pending] = useActionState(createGroup, initialState);
  useActionToast(state, "Institution created.");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Institution name</Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Institution"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

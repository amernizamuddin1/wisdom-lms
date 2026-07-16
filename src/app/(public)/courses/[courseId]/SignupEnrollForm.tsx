"use client";

import { useActionState } from "react";
import { selfEnrollFree, type EnrollFreeState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: EnrollFreeState = {};

export default function SignupEnrollForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(selfEnrollFree, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Your name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@example.com" />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enrolling..." : "Create account & enroll — Free"}
      </Button>
      <p className="text-xs text-muted-foreground">
        We&apos;ll create your account automatically. Already have one?{" "}
        <a href="/login" className="text-primary hover:underline">
          Log in
        </a>
        .
      </p>
    </form>
  );
}

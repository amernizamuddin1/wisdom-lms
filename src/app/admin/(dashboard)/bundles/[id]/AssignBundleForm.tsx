"use client";

import { useActionState } from "react";
import { assignBundleToLearner, type AssignBundleState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: AssignBundleState = {};

export default function AssignBundleForm({ bundleId }: { bundleId: string }) {
  const action = assignBundleToLearner.bind(null, bundleId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Bundle assigned.");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Bundle to a Learner</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Learner email</Label>
              <Input id="email" name="email" type="email" required placeholder="learner@example.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accessStartAt">Access start date</Label>
              <Input id="accessStartAt" name="accessStartAt" type="date" defaultValue={today} required />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Grants access to every course currently in this bundle, using the bundle&apos;s access
            duration policy. If the learner already has access to one of these courses, their
            existing access is only ever extended, never shortened.
          </p>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Assigning..." : "Assign Bundle"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

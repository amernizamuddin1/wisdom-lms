"use client";

import { useActionState } from "react";
import { assignGroupAdmin, type ActionState } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function AssignAdminForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(assignGroupAdmin.bind(null, groupId), initialState);
  useActionToast(state, "Sub-admin assigned.");

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">User email</Label>
            <Input id="email" name="email" type="email" required placeholder="admin@school.edu" />
            <p className="text-xs text-muted-foreground">The user must already have an account.</p>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Assigning..." : "Assign as Sub-admin"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState, useState } from "react";
import { updateBundleAccessPolicy, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

const PRESETS = ["3", "6", "9", "12"] as const;

export default function BundleAccessPolicyForm({
  bundleId,
  isPermanentAccess,
  accessDurationMonths,
}: {
  bundleId: string;
  isPermanentAccess: boolean;
  accessDurationMonths: number | null;
}) {
  const action = updateBundleAccessPolicy.bind(null, bundleId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Access policy saved.");

  const initialChoice = isPermanentAccess
    ? "forever"
    : accessDurationMonths != null && (PRESETS as readonly string[]).includes(String(accessDurationMonths))
      ? String(accessDurationMonths)
      : "custom";

  const [duration, setDuration] = useState(initialChoice);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Duration</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="duration">
              How long a learner keeps access after purchase/assignment
            </Label>
            <Select name="duration" value={duration} onValueChange={setDuration} required>
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select a duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="9">9 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="custom">Custom (months)</SelectItem>
                <SelectItem value="forever">Forever</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {duration === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="customMonths">Custom duration (months)</Label>
              <Input
                id="customMonths"
                name="customMonths"
                type="number"
                min="1"
                step="1"
                defaultValue={
                  accessDurationMonths != null && !isPermanentAccess ? accessDurationMonths : ""
                }
                required
              />
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Access Policy"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

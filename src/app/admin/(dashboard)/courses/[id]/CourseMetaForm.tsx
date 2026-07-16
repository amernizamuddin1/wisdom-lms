"use client";

import { useActionState, useState } from "react";
import { updateCourseMeta, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionToast } from "@/hooks/use-action-toast";
import type { CourseLevel } from "@/generated/prisma/client";

const initialState: ActionState = {};

const LEVEL_LABELS: Record<CourseLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ALL_LEVELS: "All Levels",
};

const PRESETS = ["3", "6", "9", "12"] as const;

export function CourseMetaForm({
  courseId,
  level,
  durationMinutes,
  certificateEnabled,
  isPermanentAccess,
  accessDurationMonths,
}: {
  courseId: string;
  level: CourseLevel | null;
  durationMinutes: number | null;
  certificateEnabled: boolean;
  isPermanentAccess: boolean;
  accessDurationMonths: number | null;
}) {
  const action = updateCourseMeta.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Course meta saved.");

  const [certificate, setCertificate] = useState(certificateEnabled);

  const initialAccessChoice = isPermanentAccess
    ? "forever"
    : accessDurationMonths != null && (PRESETS as readonly string[]).includes(String(accessDurationMonths))
      ? String(accessDurationMonths)
      : "custom";
  const [accessDuration, setAccessDuration] = useState(initialAccessChoice);

  const hours = durationMinutes != null ? Math.floor(durationMinutes / 60) : 0;
  const minutes = durationMinutes != null ? durationMinutes % 60 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Meta</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="level">Level</Label>
              <Select name="level" defaultValue={level ?? ""}>
                <SelectTrigger id="level">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Estimated duration</Label>
              <div className="flex items-center gap-2">
                <Input
                  name="durationHours"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={hours || ""}
                  placeholder="Hours"
                  className="flex-1"
                />
                <Input
                  name="durationMinutesPart"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  defaultValue={minutes || ""}
                  placeholder="Minutes"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accessDuration">Access duration after purchase</Label>
            <Select
              name="accessDuration"
              value={accessDuration}
              onValueChange={setAccessDuration}
              required
            >
              <SelectTrigger id="accessDuration">
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

          {accessDuration === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="customAccessMonths">Custom duration (months)</Label>
              <Input
                id="customAccessMonths"
                name="customAccessMonths"
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

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              name="certificateEnabled"
              checked={certificate}
              onCheckedChange={(checked) => setCertificate(checked === true)}
            />
            Issue a certificate of completion
          </label>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Course Meta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

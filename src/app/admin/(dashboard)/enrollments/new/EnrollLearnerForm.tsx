"use client";

import { useActionState, useState } from "react";
import { enrollLearner, type EnrollActionState } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
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

const initialState: EnrollActionState = {};

const DURATION_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "9", label: "9 months" },
  { value: "12", label: "12 months" },
  { value: "custom", label: "Custom end date" },
  { value: "forever", label: "Forever" },
];

export default function EnrollLearnerForm({
  courses,
}: {
  courses: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(enrollLearner, initialState);
  useActionToast(state, "Learner enrolled.");
  const [courseId, setCourseId] = useState("");
  const [duration, setDuration] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Learner email</Label>
              <Input id="email" name="email" type="email" required placeholder="learner@example.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="courseId">Course</Label>
              <Select name="courseId" value={courseId} onValueChange={setCourseId} required>
                <SelectTrigger id="courseId">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="accessStartAt">Access start date</Label>
              <Input id="accessStartAt" name="accessStartAt" type="date" defaultValue={today} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration">Access duration</Label>
              <Select name="duration" value={duration} onValueChange={setDuration} required>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select a duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {duration === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="customEndDate">Custom end date</Label>
              <Input id="customEndDate" name="customEndDate" type="date" required />
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Enrolling..." : "Enroll Learner"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

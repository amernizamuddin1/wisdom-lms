"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReportFilterForm({
  courses,
  bundles,
  defaults,
}: {
  courses: { id: string; title: string }[];
  bundles: { id: string; name: string }[];
  defaults: {
    scope: string;
    courseId: string;
    bundleId: string;
    status: string;
    email: string;
    enrolledFrom: string;
    enrolledTo: string;
    accessFrom: string;
    accessTo: string;
  };
}) {
  const [scope, setScope] = useState(defaults.scope);

  return (
    <form
      method="get"
      className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="scope">Scope</Label>
        <Select name="scope" value={scope} onValueChange={setScope}>
          <SelectTrigger id="scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All enrollments</SelectItem>
            <SelectItem value="course">By Course</SelectItem>
            <SelectItem value="bundle">By Bundle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scope === "course" && (
        <div className="space-y-1.5">
          <Label htmlFor="courseId">Course</Label>
          <Select name="courseId" defaultValue={defaults.courseId || undefined}>
            <SelectTrigger id="courseId">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {scope === "bundle" && (
        <div className="space-y-1.5">
          <Label htmlFor="bundleId">Bundle</Label>
          <Select name="bundleId" defaultValue={defaults.bundleId || undefined}>
            <SelectTrigger id="bundleId">
              <SelectValue placeholder="Select a bundle" />
            </SelectTrigger>
            <SelectContent>
              {bundles.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={defaults.status}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Learner email</Label>
        <Input id="email" name="email" defaultValue={defaults.email} placeholder="user@example.com" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enrolledFrom">Enrolled from</Label>
        <Input id="enrolledFrom" name="enrolledFrom" type="date" defaultValue={defaults.enrolledFrom} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enrolledTo">Enrolled to</Label>
        <Input id="enrolledTo" name="enrolledTo" type="date" defaultValue={defaults.enrolledTo} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accessFrom">Access period from</Label>
        <Input id="accessFrom" name="accessFrom" type="date" defaultValue={defaults.accessFrom} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accessTo">Access period to</Label>
        <Input id="accessTo" name="accessTo" type="date" defaultValue={defaults.accessTo} />
      </div>

      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply Filters
        </button>
      </div>
    </form>
  );
}

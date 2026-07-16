"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { addCourseToBundle, removeCourseFromBundle } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type BundleCourseOption = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  status: "DRAFT" | "PUBLISHED";
  priceUsd: number | null;
  isFree: boolean;
};

export default function BundleCoursesSection({
  bundleId,
  allCourses,
  selectedCourses,
  bundleStatus,
}: {
  bundleId: string;
  allCourses: BundleCourseOption[];
  selectedCourses: BundleCourseOption[];
  bundleStatus: "DRAFT" | "ACTIVE" | "PAUSED";
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selectedIds = useMemo(() => new Set(selectedCourses.map((c) => c.id)), [selectedCourses]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCourses
      .filter((c) => !selectedIds.has(c.id))
      .filter((c) => (q ? c.title.toLowerCase().includes(q) : true));
  }, [allCourses, selectedIds, query]);

  function handleAdd(courseId: string) {
    startTransition(async () => {
      const result = await addCourseToBundle(bundleId, courseId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Course added to bundle.");
      }
      router.refresh();
    });
  }

  function handleRemove(courseId: string) {
    if (selectedCourses.length <= 2) {
      if (
        !confirm(
          "This will bring the bundle below 2 courses. If it's currently active, removal will be blocked. Continue?",
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      const result = await removeCourseFromBundle(bundleId, courseId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Course removed from bundle.");
      }
      router.refresh();
    });
  }

  const combinedValue = selectedCourses.reduce((sum, c) => sum + (c.priceUsd ?? 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Selected Courses ({selectedCourses.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bundleStatus === "ACTIVE" && selectedCourses.length < 2 && (
            <p className="text-sm text-destructive">
              This active bundle has fewer than 2 courses — add another or pause it.
            </p>
          )}
          {selectedCourses.length === 0 && (
            <p className="text-sm text-muted-foreground">No courses selected yet.</p>
          )}
          <ul className="space-y-2">
            {selectedCourses.map((course) => (
              <li
                key={course.id}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                  {course.thumbnailUrl && (
                    <Image
                      src={course.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {course.isFree ? "Free" : course.priceUsd != null ? `$${course.priceUsd.toFixed(2)}` : "No USD price"}
                  </p>
                </div>
                <Badge variant={course.status === "PUBLISHED" ? "success" : "secondary"}>
                  {course.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleRemove(course.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Combined individual value (USD)</span>
              <span className="font-medium text-foreground">${combinedValue.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Courses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search courses by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {searchResults.map((course) => (
              <li key={course.id} className="flex items-center gap-3 rounded-md border p-2">
                <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                  {course.thumbnailUrl && (
                    <Image
                      src={course.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {course.isFree ? "Free" : course.priceUsd != null ? `$${course.priceUsd.toFixed(2)}` : "No USD price"}
                  </p>
                </div>
                <Badge variant={course.status === "PUBLISHED" ? "success" : "secondary"}>
                  {course.status}
                </Badge>
                <Button size="sm" disabled={pending} onClick={() => handleAdd(course.id)}>
                  Add
                </Button>
              </li>
            ))}
            {searchResults.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No matching courses.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignCourseInstructors } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserIcon } from "lucide-react";

export type InstructorOption = { id: string; name: string; title: string | null; avatarUrl: string | null };

function InstructorAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill unoptimized className="object-cover" />
      ) : (
        <UserIcon className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}

export function CourseInstructorsForm({
  courseId,
  allInstructors,
  selectedIds: initialSelectedIds,
}: {
  courseId: string;
  allInstructors: InstructorOption[];
  selectedIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function save() {
    startTransition(async () => {
      const result = await assignCourseInstructors(courseId, selectedIds);
      if (result?.error) toast.error(result.error);
      else toast.success("Instructors saved.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instructor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allInstructors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No instructors yet.{" "}
            <Link href="/admin/instructors" className="text-primary underline-offset-4 hover:underline">
              Add one
            </Link>{" "}
            to assign them to this course.
          </p>
        ) : (
          <ul className="space-y-2">
            {allInstructors.map((instructor) => (
              <li key={instructor.id} className="flex items-center gap-3 rounded-md border p-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(instructor.id)}
                  onChange={() => toggle(instructor.id)}
                  className="size-4"
                />
                <InstructorAvatar avatarUrl={instructor.avatarUrl} name={instructor.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{instructor.name}</p>
                  {instructor.title && (
                    <p className="truncate text-xs text-muted-foreground">{instructor.title}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save Instructors"}
          </Button>
          <Link
            href="/admin/instructors"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Manage instructor profiles
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

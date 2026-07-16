"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTransition } from "react";
import { createInstructor, updateInstructor, deleteInstructor, type ActionState } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserIcon } from "lucide-react";

export type InstructorRow = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  courseCount: number;
};

const initialState: ActionState = {};

function InstructorAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill unoptimized className="object-cover" />
      ) : (
        <UserIcon className="size-5 text-muted-foreground" />
      )}
    </div>
  );
}

function InstructorForm({
  instructor,
  onSaved,
}: {
  instructor?: InstructorRow;
  onSaved: () => void;
}) {
  const action = instructor ? updateInstructor.bind(null, instructor.id) : createInstructor;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={instructor?.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Title / designation</Label>
        <Input
          id="title"
          name="title"
          defaultValue={instructor?.title ?? ""}
          placeholder="e.g. Senior UX Engineer"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="avatarUrl">Avatar image URL</Label>
        <Input
          id="avatarUrl"
          name="avatarUrl"
          defaultValue={instructor?.avatarUrl ?? ""}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bio">Short bio</Label>
        <Textarea id="bio" name="bio" defaultValue={instructor?.bio ?? ""} rows={3} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function InstructorsManager({ instructors }: { instructors: InstructorRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InstructorRow | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(instructor: InstructorRow) {
    if (
      !confirm(
        instructor.courseCount > 0
          ? `${instructor.name} is assigned to ${instructor.courseCount} course(s). Delete anyway?`
          : `Delete ${instructor.name}?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteInstructor(instructor.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Instructor deleted.");
    });
  }

  return (
    <div className="space-y-4">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button>New Instructor</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Instructor</DialogTitle>
          </DialogHeader>
          <InstructorForm onSaved={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {instructors.map((instructor) => (
          <Card key={instructor.id}>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <InstructorAvatar avatarUrl={instructor.avatarUrl} name={instructor.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{instructor.name}</p>
                  {instructor.title && (
                    <p className="truncate text-sm text-muted-foreground">{instructor.title}</p>
                  )}
                </div>
              </div>
              {instructor.bio && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{instructor.bio}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {instructor.courseCount} course{instructor.courseCount === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(instructor)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleDelete(instructor)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {instructors.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No instructors yet. Add one to assign it to courses.
          </p>
        )}
      </div>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Instructor</DialogTitle>
          </DialogHeader>
          {editing && (
            <InstructorForm key={editing.id} instructor={editing} onSaved={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

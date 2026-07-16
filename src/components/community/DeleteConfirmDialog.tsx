"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DeleteConfirmDialog({
  contentType,
  title,
  authorName,
  affectedAnswerCount,
  onConfirm,
  trigger,
}: {
  contentType: "thread" | "answer" | "reply";
  title: string;
  authorName: string;
  affectedAnswerCount?: number;
  onConfirm: () => Promise<{ error?: string; success?: boolean }>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${labelFor(contentType)} deleted.`);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {labelFor(contentType).toLowerCase()}?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-muted-foreground">By {authorName}</p>
          {contentType === "thread" && typeof affectedAnswerCount === "number" && affectedAnswerCount > 0 && (
            <p className="text-muted-foreground">
              This will also affect {affectedAnswerCount} answer{affectedAnswerCount === 1 ? "" : "s"}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function labelFor(contentType: "thread" | "answer" | "reply"): string {
  if (contentType === "thread") return "Thread";
  if (contentType === "answer") return "Answer";
  return "Reply";
}

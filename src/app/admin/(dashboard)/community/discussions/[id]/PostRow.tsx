"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  hideAnswerAction,
  restoreAnswerAction,
  deleteAnswerAction,
  hideReplyAction,
  restoreReplyAction,
  deleteReplyAction,
} from "../actions";

export default function PostRow({
  threadId,
  kind,
  id,
  authorName,
  bodyHtml,
  createdAt,
  hiddenAt,
  deletedAt,
  isAccepted,
  indent,
}: {
  threadId: string;
  kind: "answer" | "reply";
  id: string;
  authorName: string;
  bodyHtml: string;
  createdAt: Date;
  hiddenAt: Date | null;
  deletedAt: Date | null;
  isAccepted?: boolean;
  indent?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");

  const status = deletedAt ? "DELETED" : hiddenAt ? "HIDDEN" : "ACTIVE";

  function run(action: () => Promise<{ error?: string; success?: boolean }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
      else toast.success(successMsg);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const action = kind === "answer" ? deleteAnswerAction : deleteReplyAction;
      const result = await action(threadId, id, reason.trim() || undefined);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${kind === "answer" ? "Answer" : "Reply"} deleted.`);
      setDeleteOpen(false);
      setReason("");
    });
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-2", indent && "ml-6")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{authorName}</span>
          <span className="text-xs text-muted-foreground">{createdAt.toLocaleString()}</span>
          <Badge variant="outline">{kind === "answer" ? "Answer" : "Reply"}</Badge>
          {isAccepted && <Badge variant="success">Accepted</Badge>}
          {status !== "ACTIVE" && (
            <Badge variant={status === "HIDDEN" ? "secondary" : "destructive"}>{status}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => (kind === "answer" ? hideAnswerAction(threadId, id) : hideReplyAction(threadId, id)),
                  "Hidden.",
                )
              }
            >
              Hide
            </Button>
          )}
          {status !== "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => (kind === "answer" ? restoreAnswerAction(threadId, id) : restoreReplyAction(threadId, id)),
                  "Restored.",
                )
              }
            >
              Restore
            </Button>
          )}
          {status !== "DELETED" && (
            <Button variant="destructive" size="sm" disabled={pending} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>
      <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {kind}</DialogTitle>
            <DialogDescription>This soft-deletes the {kind}. It can be restored later.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)..."
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

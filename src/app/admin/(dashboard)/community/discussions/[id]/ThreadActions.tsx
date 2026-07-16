"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  hideThreadAction,
  restoreThreadAction,
  deleteThreadAction,
  setThreadPinnedAction,
  setThreadLockedAction,
  setThreadResolvedAction,
  changeAcceptedAnswerAction,
} from "../actions";

export default function ThreadActions({
  threadId,
  status,
  isPinned,
  isLocked,
  isResolved,
  acceptedAnswerId,
  answers,
}: {
  threadId: string;
  status: string;
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  acceptedAnswerId: string | null;
  answers: { id: string; authorName: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");

  function run(action: () => Promise<{ error?: string; success?: boolean }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
      else toast.success(successMsg);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteThreadAction(threadId, reason.trim() || undefined);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Thread deleted.");
      setDeleteOpen(false);
      setReason("");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {status === "ACTIVE" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => hideThreadAction(threadId), "Thread hidden.")}
        >
          Hide
        </Button>
      )}
      {(status === "HIDDEN" || status === "DELETED") && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => restoreThreadAction(threadId), "Thread restored.")}
        >
          Restore
        </Button>
      )}
      {status !== "DELETED" && (
        <Button variant="destructive" size="sm" disabled={pending} onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      )}

      <span className="mx-1 h-5 w-px bg-border" />

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setThreadPinnedAction(threadId, !isPinned), isPinned ? "Unpinned." : "Pinned.")}
      >
        {isPinned ? "Unpin" : "Pin"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setThreadLockedAction(threadId, !isLocked), isLocked ? "Unlocked." : "Locked.")}
      >
        {isLocked ? "Unlock" : "Lock"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(() => setThreadResolvedAction(threadId, !isResolved), isResolved ? "Marked unresolved." : "Marked resolved.")
        }
      >
        {isResolved ? "Unmark resolved" : "Mark resolved"}
      </Button>

      {answers.length > 0 && (
        <>
          <span className="mx-1 h-5 w-px bg-border" />
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={acceptedAnswerId ?? ""}
            disabled={pending}
            onChange={(e) => {
              const value = e.target.value || null;
              run(() => changeAcceptedAnswerAction(threadId, value), value ? "Accepted answer changed." : "Accepted answer cleared.");
            }}
          >
            <option value="">No accepted answer</option>
            {answers.map((a) => (
              <option key={a.id} value={a.id}>
                Accept: {a.authorName}
              </option>
            ))}
          </select>
        </>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete thread</DialogTitle>
            <DialogDescription>
              This soft-deletes the thread. It can be restored later from the moderation console.
            </DialogDescription>
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
              {pending ? "Deleting..." : "Delete thread"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

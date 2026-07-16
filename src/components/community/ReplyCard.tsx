"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import LikeButton from "@/components/community/LikeButton";
import ReportDialog from "@/components/community/ReportDialog";
import DeleteConfirmDialog from "@/components/community/DeleteConfirmDialog";
import DiscussionEditor from "@/components/community/DiscussionEditor";
import { useCommunityActions } from "@/components/community/actions-context";
import { timeAgo } from "@/components/community/ThreadCard";

export type ReplyCardData = {
  id: string;
  answerId: string | null;
  bodyHtml: string;
  createdAt: Date;
  editedAt: Date | null;
  author: { id: string; name: string | null; profilePhotoUrl: string | null };
};

export default function ReplyCard({
  reply,
  threadId,
  currentUserId,
  isAdmin,
  isSignedIn,
  likeCount,
  liked,
  threadLocked,
}: {
  reply: ReplyCardData;
  threadId: string;
  currentUserId: string | null;
  isAdmin: boolean;
  isSignedIn: boolean;
  likeCount: number;
  liked: boolean;
  threadLocked: boolean;
}) {
  const { editReplyAction, deleteOwnReplyAction } = useCommunityActions();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const canModify = !!currentUserId && (currentUserId === reply.author.id || isAdmin);

  function handleEditSubmit(formData: FormData) {
    startTransition(async () => {
      const bodyHtml = String(formData.get("bodyHtml") ?? "");
      const result = await editReplyAction(reply.id, threadId, bodyHtml);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Reply updated.");
        setEditing(false);
      }
    });
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-foreground">{reply.author.name ?? "Unknown"}</span>{" "}
          <span className="text-muted-foreground">
            {timeAgo(reply.createdAt)}
            {reply.editedAt && " (edited)"}
          </span>
        </div>
      </div>

      {editing ? (
        <form action={handleEditSubmit} className="mt-2 space-y-2">
          <DiscussionEditor name="bodyHtml" defaultValue={reply.bodyHtml} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div
          className="prose prose-sm mt-1 max-w-none text-foreground [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: reply.bodyHtml }}
        />
      )}

      <div className="mt-1 flex items-center gap-1">
        <LikeButton
          entityType="REPLY"
          entityId={reply.id}
          threadId={threadId}
          initialLiked={liked}
          initialCount={likeCount}
          isSignedIn={isSignedIn}
        />
        {!threadLocked && canModify && !editing && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {canModify && (
          <DeleteConfirmDialog
            contentType="reply"
            title={reply.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 80)}
            authorName={reply.author.name ?? "Unknown"}
            onConfirm={() => deleteOwnReplyAction(reply.id, threadId)}
          />
        )}
        {isSignedIn && currentUserId !== reply.author.id && (
          <ReportDialog entityType="REPLY" entityId={reply.id} isSignedIn={isSignedIn} />
        )}
      </div>
    </div>
  );
}

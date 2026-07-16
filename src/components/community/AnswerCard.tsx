"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import LikeButton from "@/components/community/LikeButton";
import ReportDialog from "@/components/community/ReportDialog";
import DeleteConfirmDialog from "@/components/community/DeleteConfirmDialog";
import DiscussionEditor from "@/components/community/DiscussionEditor";
import AcceptAnswerButton from "@/components/community/AcceptAnswerButton";
import ReplyCard, { type ReplyCardData } from "@/components/community/ReplyCard";
import { useCommunityActions } from "@/components/community/actions-context";
import { timeAgo } from "@/components/community/ThreadCard";

export type AnswerCardData = {
  id: string;
  bodyHtml: string;
  isAccepted: boolean;
  createdAt: Date;
  editedAt: Date | null;
  author: { id: string; name: string | null; profilePhotoUrl: string | null };
};

export default function AnswerCard({
  answer,
  threadId,
  replies,
  currentUserId,
  isAdmin,
  isSignedIn,
  isThreadAuthor,
  likeCount,
  liked,
  replyLikes,
  threadLocked,
}: {
  answer: AnswerCardData;
  threadId: string;
  replies: ReplyCardData[];
  currentUserId: string | null;
  isAdmin: boolean;
  isSignedIn: boolean;
  isThreadAuthor: boolean;
  likeCount: number;
  liked: boolean;
  replyLikes: Record<string, { count: number; liked: boolean }>;
  threadLocked: boolean;
}) {
  const { editAnswerAction, deleteOwnAnswerAction, createReplyAction } = useCommunityActions();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const canModify = !!currentUserId && (currentUserId === answer.author.id || isAdmin);
  const canAccept = isThreadAuthor || isAdmin;

  function handleEditSubmit(formData: FormData) {
    startTransition(async () => {
      const bodyHtml = String(formData.get("bodyHtml") ?? "");
      const result = await editAnswerAction(answer.id, threadId, bodyHtml);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Answer updated.");
        setEditing(false);
      }
    });
  }

  function handleReplySubmit(formData: FormData) {
    startTransition(async () => {
      const bodyHtml = String(formData.get("bodyHtml") ?? "");
      const result = await createReplyAction({ threadId, answerId: answer.id, bodyHtml });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Reply posted.");
        setReplying(false);
      }
    });
  }

  return (
    <div className={`rounded-lg border p-4 ${answer.isAccepted ? "border-success bg-success-soft/30" : "bg-card"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{answer.author.name ?? "Unknown"}</span>
          <span className="text-muted-foreground">
            {timeAgo(answer.createdAt)}
            {answer.editedAt && " (edited)"}
          </span>
          {answer.isAccepted && (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2Icon className="size-3.5" />
              Accepted answer
            </span>
          )}
        </div>
      </div>

      {editing ? (
        <form action={handleEditSubmit} className="mt-2 space-y-2">
          <DiscussionEditor name="bodyHtml" defaultValue={answer.bodyHtml} />
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
          className="prose prose-sm mt-2 max-w-none text-foreground [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: answer.bodyHtml }}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <LikeButton
          entityType="ANSWER"
          entityId={answer.id}
          threadId={threadId}
          initialLiked={liked}
          initialCount={likeCount}
          isSignedIn={isSignedIn}
        />
        {!threadLocked && isSignedIn && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setReplying((v) => !v)}>
            Reply
          </Button>
        )}
        {!threadLocked && canModify && !editing && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {canModify && (
          <DeleteConfirmDialog
            contentType="answer"
            title={answer.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 80)}
            authorName={answer.author.name ?? "Unknown"}
            onConfirm={() => deleteOwnAnswerAction(answer.id, threadId)}
          />
        )}
        {isSignedIn && currentUserId !== answer.author.id && (
          <ReportDialog entityType="ANSWER" entityId={answer.id} isSignedIn={isSignedIn} />
        )}
        {!threadLocked && canAccept && (
          <AcceptAnswerButton threadId={threadId} answerId={answer.id} isAccepted={answer.isAccepted} />
        )}
      </div>

      {replying && (
        <form action={handleReplySubmit} className="mt-3 space-y-2 border-t pt-3">
          <DiscussionEditor name="bodyHtml" placeholder="Write a reply..." />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Post reply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {replies.length > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3 pl-4">
          {replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              threadId={threadId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              isSignedIn={isSignedIn}
              likeCount={replyLikes[reply.id]?.count ?? 0}
              liked={replyLikes[reply.id]?.liked ?? false}
              threadLocked={threadLocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

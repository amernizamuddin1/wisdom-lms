"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PinIcon, LockIcon, CheckCircle2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LikeButton from "@/components/community/LikeButton";
import FollowButton from "@/components/community/FollowButton";
import ReportDialog from "@/components/community/ReportDialog";
import DeleteConfirmDialog from "@/components/community/DeleteConfirmDialog";
import DiscussionEditor from "@/components/community/DiscussionEditor";
import AnswerCard, { type AnswerCardData } from "@/components/community/AnswerCard";
import ReplyCard, { type ReplyCardData } from "@/components/community/ReplyCard";
import { useCommunityActions } from "@/components/community/actions-context";
import { timeAgo } from "@/components/community/ThreadCard";

export type ThreadDetailData = {
  id: string;
  title: string;
  bodyHtml: string;
  threadType: "QUESTION" | "DISCUSSION" | "ANNOUNCEMENT";
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  viewCount: number;
  createdAt: Date;
  editedAt?: Date | null;
  author: { id: string; name: string | null; profilePhotoUrl: string | null };
  category?: { id: string; name: string; slug: string } | null;
};

export default function ThreadDetail({
  thread,
  answers,
  threadReplies,
  currentUserId,
  isAdmin,
  isSignedIn,
  following,
  threadLikeCount,
  threadLiked,
  answerLikes,
  replyLikes,
}: {
  thread: ThreadDetailData;
  answers: AnswerCardData[];
  threadReplies: ReplyCardData[];
  currentUserId: string | null;
  isAdmin: boolean;
  isSignedIn: boolean;
  following: boolean;
  threadLikeCount: number;
  threadLiked: boolean;
  answerLikes: Record<string, { count: number; liked: boolean }>;
  replyLikes: Record<string, { count: number; liked: boolean }>;
}) {
  const { editThreadAction, deleteOwnThreadAction, createAnswerAction, createReplyAction } = useCommunityActions();
  const [editing, setEditing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [pending, startTransition] = useTransition();

  const isThreadAuthor = currentUserId === thread.author.id;
  const canModify = !!currentUserId && (isThreadAuthor || isAdmin);
  const isQuestion = thread.threadType === "QUESTION";

  function handleEditSubmit(formData: FormData) {
    startTransition(async () => {
      const title = String(formData.get("title") ?? "");
      const bodyHtml = String(formData.get("bodyHtml") ?? "");
      const result = await editThreadAction(thread.id, { title, bodyHtml });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Thread updated.");
        setEditing(false);
      }
    });
  }

  function handlePostSubmit(formData: FormData) {
    startTransition(async () => {
      const bodyHtml = String(formData.get("bodyHtml") ?? "");
      const result = isQuestion
        ? await createAnswerAction(thread.id, bodyHtml)
        : await createReplyAction({ threadId: thread.id, bodyHtml });
      if (result.error) toast.error(result.error);
      else {
        toast.success(isQuestion ? "Answer posted." : "Reply posted.");
        setPosting(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {thread.isPinned && <PinIcon className="size-4 text-primary" aria-label="Pinned" />}
              {thread.isLocked && <LockIcon className="size-4 text-muted-foreground" aria-label="Locked" />}
              {thread.isResolved && <CheckCircle2Icon className="size-4 text-success" aria-label="Resolved" />}
              {editing ? null : <h1 className="text-xl font-semibold text-foreground">{thread.title}</h1>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={thread.threadType === "ANNOUNCEMENT" ? "default" : "outline"}>
                {thread.threadType === "QUESTION" ? "Question" : thread.threadType === "ANNOUNCEMENT" ? "Announcement" : "Discussion"}
              </Badge>
              {thread.category && (
                <Link href={`/community/category/${thread.category.slug}`}>
                  <Badge variant="secondary">{thread.category.name}</Badge>
                </Link>
              )}
              <span>by {thread.author.name ?? "Unknown"}</span>
              <span>&middot;</span>
              <span>{timeAgo(thread.createdAt)}</span>
              {thread.editedAt && <span>(edited)</span>}
              <span>&middot;</span>
              <span>{thread.viewCount} views</span>
            </div>
          </div>
          {isSignedIn && <FollowButton threadId={thread.id} initialFollowing={following} isSignedIn={isSignedIn} />}
        </div>

        {editing ? (
          <form action={handleEditSubmit} className="mt-4 space-y-2">
            <input
              type="text"
              name="title"
              defaultValue={thread.title}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <DiscussionEditor name="bodyHtml" defaultValue={thread.bodyHtml} />
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
            className="prose prose-sm mt-3 max-w-none text-foreground [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: thread.bodyHtml }}
          />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1 border-t pt-3">
          <LikeButton
            entityType="THREAD"
            entityId={thread.id}
            threadId={thread.id}
            initialLiked={threadLiked}
            initialCount={threadLikeCount}
            isSignedIn={isSignedIn}
          />
          {!thread.isLocked && canModify && !editing && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {canModify && (
            <DeleteConfirmDialog
              contentType="thread"
              title={thread.title}
              authorName={thread.author.name ?? "Unknown"}
              affectedAnswerCount={answers.length}
              onConfirm={() => deleteOwnThreadAction(thread.id)}
            />
          )}
          {isSignedIn && currentUserId !== thread.author.id && (
            <ReportDialog entityType="THREAD" entityId={thread.id} isSignedIn={isSignedIn} />
          )}
        </div>
      </div>

      {thread.isLocked && (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          This thread is locked. No new answers or replies can be posted.
        </div>
      )}

      {isQuestion && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">
            {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
          </h2>
          <div className="space-y-3">
            {answers.map((answer) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                threadId={thread.id}
                replies={threadReplies.filter((r) => r.answerId === answer.id)}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isSignedIn={isSignedIn}
                isThreadAuthor={isThreadAuthor}
                likeCount={answerLikes[answer.id]?.count ?? 0}
                liked={answerLikes[answer.id]?.liked ?? false}
                replyLikes={replyLikes}
                threadLocked={thread.isLocked}
              />
            ))}
          </div>
        </div>
      )}

      {!isQuestion && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">
            {threadReplies.filter((r) => !r.answerId).length}{" "}
            {threadReplies.filter((r) => !r.answerId).length === 1 ? "Reply" : "Replies"}
          </h2>
          <div className="space-y-2">
            {threadReplies
              .filter((r) => !r.answerId)
              .map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  threadId={thread.id}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isSignedIn={isSignedIn}
                  likeCount={replyLikes[reply.id]?.count ?? 0}
                  liked={replyLikes[reply.id]?.liked ?? false}
                  threadLocked={thread.isLocked}
                />
              ))}
          </div>
        </div>
      )}

      {!thread.isLocked && (
        <div className="rounded-lg border bg-card p-4">
          {isSignedIn ? (
            posting ? (
              <form action={handlePostSubmit} className="space-y-2">
                <DiscussionEditor name="bodyHtml" placeholder={isQuestion ? "Write your answer..." : "Write a reply..."} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={pending}>
                    {isQuestion ? "Post answer" : "Post reply"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPosting(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button type="button" onClick={() => setPosting(true)}>
                {isQuestion ? "Write an answer" : "Write a reply"}
              </Button>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>{" "}
              to {isQuestion ? "answer" : "reply to"} this thread.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

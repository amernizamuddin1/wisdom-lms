"use client";

import Link from "next/link";
import { PinIcon, LockIcon, CheckCircle2Icon, MessageSquareIcon, EyeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCommunityActions } from "@/components/community/actions-context";

export type ThreadCardData = {
  id: string;
  title: string;
  threadType: "QUESTION" | "DISCUSSION" | "ANNOUNCEMENT";
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  viewCount: number;
  lastActivityAt: Date;
  author: { id: string; name: string | null; profilePhotoUrl: string | null };
  category?: { id: string; name: string; slug: string } | null;
  _count: { answers: number; replies: number };
};

const TYPE_LABEL: Record<ThreadCardData["threadType"], string> = {
  QUESTION: "Question",
  DISCUSSION: "Discussion",
  ANNOUNCEMENT: "Announcement",
};

export default function ThreadCard({ thread }: { thread: ThreadCardData }) {
  const { threadHref } = useCommunityActions();
  return (
    <Link
      href={threadHref(thread.id)}
      className={cn(
        "flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between",
        cardVariants({ variant: "interactive" }),
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {thread.isPinned && <PinIcon className="size-3.5 shrink-0 text-primary" aria-label="Pinned" />}
          {thread.isLocked && <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Locked" />}
          {thread.isResolved && <CheckCircle2Icon className="size-3.5 shrink-0 text-success" aria-label="Resolved" />}
          <h3 className="truncate font-medium text-foreground">{thread.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={thread.threadType === "ANNOUNCEMENT" ? "default" : "outline"}>
            {TYPE_LABEL[thread.threadType]}
          </Badge>
          {thread.category && <Badge variant="secondary">{thread.category.name}</Badge>}
          <span>by {thread.author.name ?? "Unknown"}</span>
          <span>&middot;</span>
          <span>{timeAgo(thread.lastActivityAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
        <span className={cn("flex items-center gap-1", thread._count.answers > 0 && "text-foreground")}>
          <MessageSquareIcon className="size-4" />
          {thread._count.answers + thread._count.replies}
        </span>
        <span className="flex items-center gap-1">
          <EyeIcon className="size-4" />
          {thread.viewCount}
        </span>
      </div>
    </Link>
  );
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

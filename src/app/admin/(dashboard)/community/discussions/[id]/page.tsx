import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import ThreadActions from "./ThreadActions";
import PostRow from "./PostRow";

function statusVariant(status: string): "success" | "secondary" | "destructive" {
  if (status === "ACTIVE") return "success";
  if (status === "HIDDEN") return "secondary";
  return "destructive";
}

export default async function AdminDiscussionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const thread = await prisma.discussionThread.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      hiddenBy: { select: { name: true, email: true } },
      deletedBy: { select: { name: true, email: true } },
    },
  });
  if (!thread) notFound();

  const [answers, replies] = await Promise.all([
    prisma.discussionAnswer.findMany({
      where: { threadId: id },
      orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }],
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
    prisma.discussionReply.findMany({
      where: { threadId: id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const repliesByAnswer = new Map<string | "thread", typeof replies>();
  for (const reply of replies) {
    const key = reply.answerId ?? "thread";
    const list = repliesByAnswer.get(key) ?? [];
    list.push(reply);
    repliesByAnswer.set(key, list);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/community/discussions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to discussions
      </Link>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{thread.title}</h2>
              <Badge variant={statusVariant(thread.status)}>{thread.status}</Badge>
              {thread.isPinned && <Badge variant="outline">Pinned</Badge>}
              {thread.isLocked && <Badge variant="outline">Locked</Badge>}
              {thread.isResolved && <Badge variant="outline">Resolved</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              By {thread.author.name ?? thread.author.email} · {thread.threadType} ·{" "}
              {thread.course ? `Course: ${thread.course.title}` : thread.category ? `Category: ${thread.category.name}` : "Global"}
            </p>
            <p className="text-xs text-muted-foreground">
              Created {thread.createdAt.toLocaleString()} · Last activity {thread.lastActivityAt.toLocaleString()} ·{" "}
              {thread.viewCount} views
            </p>
            {thread.status === "HIDDEN" && thread.hiddenBy && (
              <p className="text-xs text-muted-foreground">
                Hidden by {thread.hiddenBy.name ?? thread.hiddenBy.email} at {thread.hiddenAt?.toLocaleString()}
              </p>
            )}
            {thread.status === "DELETED" && thread.deletedBy && (
              <p className="text-xs text-muted-foreground">
                Deleted by {thread.deletedBy.name ?? thread.deletedBy.email} at {thread.deletedAt?.toLocaleString()}
                {thread.deletionReason ? ` — ${thread.deletionReason}` : ""}
              </p>
            )}
          </div>
        </div>

        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: thread.bodyHtml }}
        />

        <ThreadActions
          threadId={thread.id}
          status={thread.status}
          isPinned={thread.isPinned}
          isLocked={thread.isLocked}
          isResolved={thread.isResolved}
          acceptedAnswerId={thread.acceptedAnswerId}
          answers={answers.map((a) => ({ id: a.id, authorName: a.author.name ?? a.author.email }))}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Answers ({answers.length}) & Replies ({replies.length})
        </h3>

        {(repliesByAnswer.get("thread") ?? []).map((reply) => (
          <PostRow
            key={reply.id}
            threadId={thread.id}
            kind="reply"
            id={reply.id}
            authorName={reply.author.name ?? reply.author.email}
            bodyHtml={reply.bodyHtml}
            createdAt={reply.createdAt}
            hiddenAt={reply.hiddenAt}
            deletedAt={reply.deletedAt}
            indent
          />
        ))}

        {answers.map((answer) => (
          <div key={answer.id} className="space-y-2">
            <PostRow
              threadId={thread.id}
              kind="answer"
              id={answer.id}
              authorName={answer.author.name ?? answer.author.email}
              bodyHtml={answer.bodyHtml}
              createdAt={answer.createdAt}
              hiddenAt={answer.hiddenAt}
              deletedAt={answer.deletedAt}
              isAccepted={answer.isAccepted}
            />
            {(repliesByAnswer.get(answer.id) ?? []).map((reply) => (
              <PostRow
                key={reply.id}
                threadId={thread.id}
                kind="reply"
                id={reply.id}
                authorName={reply.author.name ?? reply.author.email}
                bodyHtml={reply.bodyHtml}
                createdAt={reply.createdAt}
                hiddenAt={reply.hiddenAt}
                deletedAt={reply.deletedAt}
                indent
              />
            ))}
          </div>
        ))}

        {answers.length === 0 && (repliesByAnswer.get("thread") ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No answers or replies yet.</p>
        )}
      </div>
    </div>
  );
}

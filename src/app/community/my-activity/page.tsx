import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MyActivityPage() {
  const user = await requireUser();

  const [threads, answers, replies, gamificationProfile] = await Promise.all([
    prisma.discussionThread.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { category: true, _count: { select: { answers: true, replies: true } } },
    }),
    prisma.discussionAnswer.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { thread: { select: { id: true, title: true } } },
    }),
    prisma.discussionReply.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { thread: { select: { id: true, title: true } } },
    }),
    prisma.userGamificationProfile.findUnique({ where: { userId: user.id } }).catch(() => null),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Activity</h1>
        <p className="text-sm text-muted-foreground">Your threads, answers, and replies — including hidden or moderated content.</p>
      </div>

      {gamificationProfile && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total XP</p>
              <p className="text-lg font-semibold text-foreground">{gamificationProfile.totalXp}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Streak</p>
              <p className="text-lg font-semibold text-foreground">{gamificationProfile.currentStreak} days</p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">Your Threads ({threads.length})</h2>
        {threads.length === 0 ? (
          <EmptyState title="You haven't started any discussions yet" />
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/community/${thread.id}`}
                className="flex items-center justify-between gap-2 rounded-md border bg-card p-3 hover:border-primary/50 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{thread.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {thread._count.answers} answers &middot; {thread._count.replies} replies
                  </p>
                </div>
                {thread.status !== "ACTIVE" && <Badge variant="destructive">{thread.status}</Badge>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">Your Answers ({answers.length})</h2>
        {answers.length === 0 ? (
          <EmptyState title="You haven't answered any questions yet" />
        ) : (
          <div className="space-y-2">
            {answers.map((answer) => (
              <Link
                key={answer.id}
                href={`/community/${answer.thread.id}`}
                className="flex items-center justify-between gap-2 rounded-md border bg-card p-3 hover:border-primary/50 hover:bg-muted/30"
              >
                <p className="truncate font-medium text-foreground">{answer.thread.title}</p>
                <div className="flex shrink-0 gap-1">
                  {answer.isAccepted && <Badge variant="success">Accepted</Badge>}
                  {(answer.hiddenAt || answer.deletedAt) && <Badge variant="destructive">Hidden</Badge>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">Your Replies ({replies.length})</h2>
        {replies.length === 0 ? (
          <EmptyState title="You haven't replied to any discussions yet" />
        ) : (
          <div className="space-y-2">
            {replies.map((reply) => (
              <Link
                key={reply.id}
                href={`/community/${reply.thread.id}`}
                className="flex items-center justify-between gap-2 rounded-md border bg-card p-3 hover:border-primary/50 hover:bg-muted/30"
              >
                <p className="truncate font-medium text-foreground">{reply.thread.title}</p>
                {(reply.hiddenAt || reply.deletedAt) && <Badge variant="destructive">Hidden</Badge>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

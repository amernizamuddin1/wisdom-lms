import { notFound } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";
import { getThreadById, incrementViewCount } from "@/lib/community/threads";
import { listAnswers } from "@/lib/community/answers";
import { listReplies } from "@/lib/community/replies";
import { isFollowing } from "@/lib/community/follows";
import { getReactionCounts, getUserLikedEntityIds } from "@/lib/community/reactions";
import ThreadDetail from "@/components/community/ThreadDetail";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const user = await getOptionalUser();
  const isAdmin = user?.role === "ADMIN";

  const thread = await getThreadById(threadId, { includeHiddenDeleted: isAdmin });
  if (!thread || (thread.status !== "ACTIVE" && !isAdmin)) notFound();

  // Fire-and-forget — don't block render on the view-count write.
  void incrementViewCount(threadId);

  const [answers, replies] = await Promise.all([
    listAnswers(threadId, isAdmin),
    listReplies(threadId, isAdmin),
  ]);

  const answerIds = answers.map((a) => a.id);
  const replyIds = replies.map((r) => r.id);

  const [threadLikeCounts, answerLikeCounts, replyLikeCounts, following, userLikedThread, userLikedAnswers, userLikedReplies] =
    await Promise.all([
      getReactionCounts("THREAD", [threadId]),
      getReactionCounts("ANSWER", answerIds),
      getReactionCounts("REPLY", replyIds),
      user ? isFollowing(user.id, threadId) : Promise.resolve(false),
      user ? getUserLikedEntityIds(user.id, "THREAD", [threadId]) : Promise.resolve(new Set<string>()),
      user ? getUserLikedEntityIds(user.id, "ANSWER", answerIds) : Promise.resolve(new Set<string>()),
      user ? getUserLikedEntityIds(user.id, "REPLY", replyIds) : Promise.resolve(new Set<string>()),
    ]);

  const answerLikes: Record<string, { count: number; liked: boolean }> = {};
  for (const id of answerIds) {
    answerLikes[id] = { count: answerLikeCounts[id] ?? 0, liked: userLikedAnswers.has(id) };
  }
  const replyLikes: Record<string, { count: number; liked: boolean }> = {};
  for (const id of replyIds) {
    replyLikes[id] = { count: replyLikeCounts[id] ?? 0, liked: userLikedReplies.has(id) };
  }

  return (
    <ThreadDetail
      thread={{
        id: thread.id,
        title: thread.title,
        bodyHtml: thread.bodyHtml,
        threadType: thread.threadType,
        isPinned: thread.isPinned,
        isLocked: thread.isLocked,
        isResolved: thread.isResolved,
        viewCount: thread.viewCount,
        createdAt: thread.createdAt,
        editedAt: null,
        author: thread.author,
        category: thread.category,
      }}
      answers={answers}
      threadReplies={replies}
      currentUserId={user?.id ?? null}
      isAdmin={isAdmin}
      isSignedIn={!!user}
      following={following}
      threadLikeCount={threadLikeCounts[threadId] ?? 0}
      threadLiked={userLikedThread.has(threadId)}
      answerLikes={answerLikes}
      replyLikes={replyLikes}
    />
  );
}

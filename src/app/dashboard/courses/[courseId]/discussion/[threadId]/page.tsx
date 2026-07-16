import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canAccessCourseDiscussion } from "@/lib/community/access";
import { getThreadById, incrementViewCount } from "@/lib/community/threads";
import { listAnswers } from "@/lib/community/answers";
import { listReplies } from "@/lib/community/replies";
import { isFollowing } from "@/lib/community/follows";
import { getReactionCounts, getUserLikedEntityIds } from "@/lib/community/reactions";
import ThreadDetail from "@/components/community/ThreadDetail";
import DiscussionActionsProvider from "../DiscussionActionsProvider";
import DiscussionPageShell from "../DiscussionPageShell";
import { getCourseShell } from "../course-shell";

export default async function CourseDiscussionThreadPage({
  params,
}: {
  params: Promise<{ courseId: string; threadId: string }>;
}) {
  const user = await requireUser();
  const { courseId, threadId } = await params;
  const isAdmin = user.role === "ADMIN";

  const canAccess = await canAccessCourseDiscussion(user.id, courseId, user.role as "ADMIN" | "STUDENT");
  if (!canAccess) notFound();

  const thread = await getThreadById(threadId, { includeHiddenDeleted: isAdmin });
  if (!thread || thread.courseId !== courseId || (thread.status !== "ACTIVE" && !isAdmin)) notFound();

  const shell = await getCourseShell(courseId, user.id);

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
      isFollowing(user.id, threadId),
      getUserLikedEntityIds(user.id, "THREAD", [threadId]),
      getUserLikedEntityIds(user.id, "ANSWER", answerIds),
      getUserLikedEntityIds(user.id, "REPLY", replyIds),
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
    <DiscussionActionsProvider courseId={courseId}>
      <DiscussionPageShell courseId={courseId} shell={shell}>
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
            category: null,
          }}
          answers={answers}
          threadReplies={replies}
          currentUserId={user.id}
          isAdmin={isAdmin}
          isSignedIn
          following={following}
          threadLikeCount={threadLikeCounts[threadId] ?? 0}
          threadLiked={userLikedThread.has(threadId)}
          answerLikes={answerLikes}
          replyLikes={replyLikes}
        />
      </DiscussionPageShell>
    </DiscussionActionsProvider>
  );
}

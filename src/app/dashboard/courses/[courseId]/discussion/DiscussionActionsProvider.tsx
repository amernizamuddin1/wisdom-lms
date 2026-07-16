"use client";

// Binds the course-scoped server actions (courseId baked in) to the shape
// the shared community components expect (see
// src/components/community/actions-context.tsx), and wraps children in the
// provider. Keeps ThreadCard/ThreadDetail/AnswerCard/ReplyCard/LikeButton/
// FollowButton/AcceptAnswerButton/ReportDialog reusable as-is between the
// global /community area and this per-course discussion tab.
import { CommunityActionsProvider, type CommunityActionsBundle } from "@/components/community/actions-context";
import * as courseActions from "./actions";

export default function DiscussionActionsProvider({
  courseId,
  children,
}: {
  courseId: string;
  children: React.ReactNode;
}) {
  const actions: CommunityActionsBundle = {
    createThreadAction: (input) =>
      courseActions.createThreadAction({
        courseId,
        title: input.title,
        bodyHtml: input.bodyHtml,
        threadType: input.threadType === "ANNOUNCEMENT" ? "DISCUSSION" : input.threadType,
      }),
    editThreadAction: (threadId, data) => courseActions.editThreadAction(courseId, threadId, data),
    deleteOwnThreadAction: (threadId) => courseActions.deleteOwnThreadAction(courseId, threadId),
    createAnswerAction: (threadId, bodyHtml) => courseActions.createAnswerAction(courseId, threadId, bodyHtml),
    editAnswerAction: (answerId, threadId, bodyHtml) => courseActions.editAnswerAction(courseId, answerId, threadId, bodyHtml),
    deleteOwnAnswerAction: (answerId, threadId) => courseActions.deleteOwnAnswerAction(courseId, answerId, threadId),
    createReplyAction: (input) => courseActions.createReplyAction({ courseId, ...input }),
    editReplyAction: (replyId, threadId, bodyHtml) => courseActions.editReplyAction(courseId, replyId, threadId, bodyHtml),
    deleteOwnReplyAction: (replyId, threadId) => courseActions.deleteOwnReplyAction(courseId, replyId, threadId),
    acceptAnswerAction: (threadId, answerId) => courseActions.acceptAnswerAction(courseId, threadId, answerId),
    unacceptAnswerAction: (threadId, answerId) => courseActions.unacceptAnswerAction(courseId, threadId, answerId),
    toggleReactionAction: (entityType, entityId, threadId) =>
      courseActions.toggleReactionAction(courseId, entityType, entityId, threadId),
    toggleFollowAction: (threadId) => courseActions.toggleFollowAction(courseId, threadId),
    createReportAction: (input) => courseActions.createReportAction({ courseId, ...input }),
    threadHref: (threadId) => `/dashboard/courses/${courseId}/discussion/${threadId}`,
  };

  return <CommunityActionsProvider actions={actions}>{children}</CommunityActionsProvider>;
}

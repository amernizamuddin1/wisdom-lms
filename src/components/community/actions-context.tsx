"use client";

// Shared community components (ThreadCard, ThreadDetail, AnswerCard,
// ReplyCard, LikeButton, FollowButton, AcceptAnswerButton, ReportDialog)
// are used both by the global /community area and by the per-course
// discussion tab under /dashboard/courses/[courseId]/discussion. The two
// areas call different server actions (course actions additionally check
// canAccessCourseDiscussion) and link to different thread URLs.
//
// Rather than forking the presentational components, they read their
// action functions + link-builder from this context. The default value is
// the global /community behavior, so nothing changes for existing callers
// that don't wrap themselves in a <CommunityActionsProvider>. The course
// discussion pages provide their own bundle (see
// src/app/dashboard/courses/[courseId]/discussion/actions.ts).

import { createContext, useContext } from "react";
import * as globalActions from "@/app/community/actions";

export type CommunityActionsBundle = {
  createThreadAction: typeof globalActions.createThreadAction;
  editThreadAction: typeof globalActions.editThreadAction;
  deleteOwnThreadAction: typeof globalActions.deleteOwnThreadAction;
  createAnswerAction: typeof globalActions.createAnswerAction;
  editAnswerAction: typeof globalActions.editAnswerAction;
  deleteOwnAnswerAction: typeof globalActions.deleteOwnAnswerAction;
  createReplyAction: typeof globalActions.createReplyAction;
  editReplyAction: typeof globalActions.editReplyAction;
  deleteOwnReplyAction: typeof globalActions.deleteOwnReplyAction;
  acceptAnswerAction: typeof globalActions.acceptAnswerAction;
  unacceptAnswerAction: typeof globalActions.unacceptAnswerAction;
  toggleReactionAction: typeof globalActions.toggleReactionAction;
  toggleFollowAction: typeof globalActions.toggleFollowAction;
  createReportAction: typeof globalActions.createReportAction;
  /** Builds the URL for a thread's detail page. */
  threadHref: (threadId: string) => string;
};

export const defaultCommunityActions: CommunityActionsBundle = {
  createThreadAction: globalActions.createThreadAction,
  editThreadAction: globalActions.editThreadAction,
  deleteOwnThreadAction: globalActions.deleteOwnThreadAction,
  createAnswerAction: globalActions.createAnswerAction,
  editAnswerAction: globalActions.editAnswerAction,
  deleteOwnAnswerAction: globalActions.deleteOwnAnswerAction,
  createReplyAction: globalActions.createReplyAction,
  editReplyAction: globalActions.editReplyAction,
  deleteOwnReplyAction: globalActions.deleteOwnReplyAction,
  acceptAnswerAction: globalActions.acceptAnswerAction,
  unacceptAnswerAction: globalActions.unacceptAnswerAction,
  toggleReactionAction: globalActions.toggleReactionAction,
  toggleFollowAction: globalActions.toggleFollowAction,
  createReportAction: globalActions.createReportAction,
  threadHref: (threadId) => `/community/${threadId}`,
};

const CommunityActionsContext = createContext<CommunityActionsBundle>(defaultCommunityActions);

export function CommunityActionsProvider({
  actions,
  children,
}: {
  actions: CommunityActionsBundle;
  children: React.ReactNode;
}) {
  return <CommunityActionsContext.Provider value={actions}>{children}</CommunityActionsContext.Provider>;
}

export function useCommunityActions(): CommunityActionsBundle {
  return useContext(CommunityActionsContext);
}

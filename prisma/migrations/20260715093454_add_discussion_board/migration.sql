-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('QUESTION', 'DISCUSSION', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "ReactionEntityType" AS ENUM ('THREAD', 'ANSWER', 'REPLY');

-- CreateEnum
CREATE TYPE "ReportEntityType" AS ENUM ('THREAD', 'ANSWER', 'REPLY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'OFFENSIVE', 'MISLEADING', 'INAPPROPRIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('TEMPORARY', 'PERMANENT');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('EDIT', 'HIDE', 'RESTORE', 'DELETE', 'RESTORE_DELETED', 'PIN', 'UNPIN', 'LOCK', 'UNLOCK', 'MARK_RESOLVED', 'UNMARK_RESOLVED', 'ACCEPT_ANSWER', 'CHANGE_ACCEPTED_ANSWER', 'RESTRICT_USER', 'RESTORE_POSTING', 'REVIEW_REPORT', 'RESOLVE_REPORT', 'DISMISS_REPORT');

-- CreateEnum
CREATE TYPE "CommunityVisibilityType" AS ENUM ('PUBLIC', 'ENROLLED_ONLY');

-- CreateEnum
CREATE TYPE "CommunityPostingPermission" AS ENUM ('ANYONE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "DiscussionNotificationType" AS ENUM ('ANSWERED_QUESTION', 'REPLIED_TO_THREAD', 'REPLIED_TO_ANSWER', 'ANSWER_ACCEPTED', 'THREAD_PINNED', 'THREAD_LOCKED', 'MODERATION_ACTION', 'FOLLOWED_THREAD_ACTIVITY');

-- CreateEnum
CREATE TYPE "CommunitySortOrder" AS ENUM ('LATEST', 'POPULAR', 'UNANSWERED');

-- CreateEnum
CREATE TYPE "AnnouncementCreatorRole" AS ENUM ('ADMIN_ONLY');

-- CreateTable
CREATE TABLE "community_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "visibility_type" "CommunityVisibilityType" NOT NULL DEFAULT 'PUBLIC',
    "posting_permission" "CommunityPostingPermission" NOT NULL DEFAULT 'ANYONE',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_threads" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "category_id" TEXT,
    "course_id" TEXT,
    "title" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "thread_type" "ThreadType" NOT NULL DEFAULT 'DISCUSSION',
    "status" "ThreadStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "accepted_answer_id" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden_at" TIMESTAMP(3),
    "hidden_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "discussion_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_answers" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),
    "hidden_at" TIMESTAMP(3),
    "hidden_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "discussion_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_replies" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "answer_id" TEXT,
    "author_id" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),
    "hidden_at" TIMESTAMP(3),
    "hidden_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_reactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" "ReactionEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "reaction_type" TEXT NOT NULL DEFAULT 'LIKE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_follows" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "entity_type" "ReportEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_user_restrictions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restriction_type" "RestrictionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lifted_by" TEXT,
    "lifted_at" TIMESTAMP(3),

    CONSTRAINT "community_user_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_moderation_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action_type" "ModerationActionType" NOT NULL,
    "target_user_id" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "thread_id" TEXT,
    "previous_state" TEXT,
    "new_state" TEXT,
    "previous_content" TEXT,
    "new_content" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "DiscussionNotificationType" NOT NULL,
    "actor_id" TEXT,
    "thread_id" TEXT,
    "answer_id" TEXT,
    "reply_id" TEXT,
    "group_count" INTEGER NOT NULL DEFAULT 1,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "community_enabled" BOOLEAN NOT NULL DEFAULT true,
    "course_discussions_enabled" BOOLEAN NOT NULL DEFAULT true,
    "allow_global_discussion_creation" BOOLEAN NOT NULL DEFAULT true,
    "allow_course_questions" BOOLEAN NOT NULL DEFAULT true,
    "allow_likes" BOOLEAN NOT NULL DEFAULT true,
    "allow_reporting" BOOLEAN NOT NULL DEFAULT true,
    "allow_image_uploads" BOOLEAN NOT NULL DEFAULT true,
    "max_image_size_mb" INTEGER NOT NULL DEFAULT 5,
    "allowed_image_formats" TEXT[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'webp']::TEXT[],
    "allow_post_editing" BOOLEAN NOT NULL DEFAULT true,
    "allow_answer_editing" BOOLEAN NOT NULL DEFAULT true,
    "allow_reply_editing" BOOLEAN NOT NULL DEFAULT true,
    "auto_follow_on_participation" BOOLEAN NOT NULL DEFAULT true,
    "default_sort_order" "CommunitySortOrder" NOT NULL DEFAULT 'LATEST',
    "announcement_creator_role" "AnnouncementCreatorRole" NOT NULL DEFAULT 'ADMIN_ONLY',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_categories_slug_key" ON "community_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_threads_accepted_answer_id_key" ON "discussion_threads"("accepted_answer_id");

-- CreateIndex
CREATE INDEX "discussion_threads_course_id_idx" ON "discussion_threads"("course_id");

-- CreateIndex
CREATE INDEX "discussion_threads_category_id_idx" ON "discussion_threads"("category_id");

-- CreateIndex
CREATE INDEX "discussion_threads_author_id_idx" ON "discussion_threads"("author_id");

-- CreateIndex
CREATE INDEX "discussion_threads_thread_type_idx" ON "discussion_threads"("thread_type");

-- CreateIndex
CREATE INDEX "discussion_threads_status_idx" ON "discussion_threads"("status");

-- CreateIndex
CREATE INDEX "discussion_threads_created_at_idx" ON "discussion_threads"("created_at");

-- CreateIndex
CREATE INDEX "discussion_threads_last_activity_at_idx" ON "discussion_threads"("last_activity_at");

-- CreateIndex
CREATE INDEX "discussion_threads_is_resolved_idx" ON "discussion_threads"("is_resolved");

-- CreateIndex
CREATE INDEX "discussion_threads_is_pinned_idx" ON "discussion_threads"("is_pinned");

-- CreateIndex
CREATE INDEX "discussion_threads_deleted_at_idx" ON "discussion_threads"("deleted_at");

-- CreateIndex
CREATE INDEX "discussion_threads_hidden_at_idx" ON "discussion_threads"("hidden_at");

-- CreateIndex
CREATE INDEX "discussion_answers_thread_id_idx" ON "discussion_answers"("thread_id");

-- CreateIndex
CREATE INDEX "discussion_answers_author_id_idx" ON "discussion_answers"("author_id");

-- CreateIndex
CREATE INDEX "discussion_answers_deleted_at_idx" ON "discussion_answers"("deleted_at");

-- CreateIndex
CREATE INDEX "discussion_answers_hidden_at_idx" ON "discussion_answers"("hidden_at");

-- CreateIndex
CREATE INDEX "discussion_replies_thread_id_idx" ON "discussion_replies"("thread_id");

-- CreateIndex
CREATE INDEX "discussion_replies_answer_id_idx" ON "discussion_replies"("answer_id");

-- CreateIndex
CREATE INDEX "discussion_replies_author_id_idx" ON "discussion_replies"("author_id");

-- CreateIndex
CREATE INDEX "discussion_reactions_entity_type_entity_id_idx" ON "discussion_reactions"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_reactions_user_id_entity_type_entity_id_reaction_key" ON "discussion_reactions"("user_id", "entity_type", "entity_id", "reaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_follows_user_id_thread_id_key" ON "discussion_follows"("user_id", "thread_id");

-- CreateIndex
CREATE INDEX "discussion_reports_entity_type_entity_id_idx" ON "discussion_reports"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "discussion_reports_status_idx" ON "discussion_reports"("status");

-- CreateIndex
CREATE INDEX "discussion_reports_reporter_id_idx" ON "discussion_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "community_user_restrictions_user_id_idx" ON "community_user_restrictions"("user_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_actor_id_idx" ON "community_moderation_logs"("actor_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_entity_type_entity_id_idx" ON "community_moderation_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_thread_id_idx" ON "community_moderation_logs"("thread_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_created_at_idx" ON "community_moderation_logs"("created_at");

-- CreateIndex
CREATE INDEX "discussion_notifications_user_id_read_at_idx" ON "discussion_notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "discussion_notifications_user_id_created_at_idx" ON "discussion_notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "community_categories" ADD CONSTRAINT "community_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "community_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_accepted_answer_id_fkey" FOREIGN KEY ("accepted_answer_id") REFERENCES "discussion_answers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_answers" ADD CONSTRAINT "discussion_answers_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_answers" ADD CONSTRAINT "discussion_answers_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_answers" ADD CONSTRAINT "discussion_answers_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_answers" ADD CONSTRAINT "discussion_answers_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "discussion_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reactions" ADD CONSTRAINT "discussion_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_follows" ADD CONSTRAINT "discussion_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_follows" ADD CONSTRAINT "discussion_follows_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_user_restrictions" ADD CONSTRAINT "community_user_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_user_restrictions" ADD CONSTRAINT "community_user_restrictions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_user_restrictions" ADD CONSTRAINT "community_user_restrictions_lifted_by_fkey" FOREIGN KEY ("lifted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_moderation_logs" ADD CONSTRAINT "community_moderation_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_moderation_logs" ADD CONSTRAINT "community_moderation_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_notifications" ADD CONSTRAINT "discussion_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_notifications" ADD CONSTRAINT "discussion_notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

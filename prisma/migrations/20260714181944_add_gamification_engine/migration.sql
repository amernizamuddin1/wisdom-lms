-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('USER_REGISTERED', 'PROFILE_COMPLETED', 'COURSE_ENROLLED', 'LESSON_STARTED', 'LESSON_COMPLETED', 'MODULE_COMPLETED', 'COURSE_COMPLETED', 'VIDEO_WATCH_PROGRESS', 'QUIZ_STARTED', 'QUIZ_COMPLETED', 'QUIZ_PASSED', 'QUIZ_HIGH_SCORE', 'QUIZ_PERFECT_SCORE', 'ASSIGNMENT_SUBMITTED', 'ASSIGNMENT_COMPLETED', 'DISCUSSION_POST_CREATED', 'DISCUSSION_REPLY_CREATED', 'DISCUSSION_REACTION_RECEIVED', 'DISCUSSION_ANSWER_MARKED_HELPFUL', 'DISCUSSION_ANSWER_ACCEPTED', 'CERTIFICATE_EARNED', 'DAILY_LEARNING_GOAL_COMPLETED', 'STREAK_MILESTONE_REACHED', 'BADGE_EARNED', 'LEVEL_REACHED');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('LEARNING', 'MASTERY', 'CONSISTENCY', 'COMMUNITY', 'LEARNING_TIME', 'SPECIAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- CreateTable
CREATE TABLE "user_activity_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "course_id" TEXT,
    "chapter_id" TEXT,
    "lesson_id" TEXT,
    "quiz_id" TEXT,
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_xp_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "rule_code" TEXT,
    "dedupe_key" TEXT,
    "source_event_id" TEXT,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "metadata_json" JSONB,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversed_at" TIMESTAMP(3),
    "reversed_by" TEXT,
    "reversal_reason" TEXT,
    "created_by_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_gamification_profiles" (
    "user_id" TEXT NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_qualifying_date" TEXT,
    "total_active_days" INTEGER NOT NULL DEFAULT 0,
    "total_learning_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_video_watch_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_gamification_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "gamification_levels" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "min_xp" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gamification_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_rules" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "xp_amount" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "daily_cap" INTEGER,
    "qualifying_condition_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_rules_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "achievement_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "unlock_criteria_json" JSONB NOT NULL,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "asset_path" TEXT NOT NULL,
    "locked_asset_path" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress_current" INTEGER,
    "viewed_at" TIMESTAMP(3),

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_learning_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_date" TEXT NOT NULL,
    "learning_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "video_watch_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "lessons_completed" INTEGER NOT NULL DEFAULT 0,
    "quizzes_completed" INTEGER NOT NULL DEFAULT 0,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    "is_qualifying_day" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_daily_learning_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_activity_events_user_id_type_idx" ON "user_activity_events"("user_id", "type");

-- CreateIndex
CREATE INDEX "user_activity_events_user_id_created_at_idx" ON "user_activity_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_xp_transactions_user_id_created_at_idx" ON "user_xp_transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_xp_transactions_user_id_dedupe_key_key" ON "user_xp_transactions"("user_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_levels_order_key" ON "gamification_levels"("order");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_learning_activity_user_id_activity_date_key" ON "user_daily_learning_activity"("user_id", "activity_date");

-- AddForeignKey
ALTER TABLE "user_activity_events" ADD CONSTRAINT "user_activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_xp_transactions" ADD CONSTRAINT "user_xp_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_xp_transactions" ADD CONSTRAINT "user_xp_transactions_source_event_id_fkey" FOREIGN KEY ("source_event_id") REFERENCES "user_activity_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_xp_transactions" ADD CONSTRAINT "user_xp_transactions_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gamification_profiles" ADD CONSTRAINT "user_gamification_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievement_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_learning_activity" ADD CONSTRAINT "user_daily_learning_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "achievement_definitions" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "admin_audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "bundle_courses" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "bundle_enrollments" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "bundle_prices" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cart_items" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "carts" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "certificates" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "chapters" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "commerce_events" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "community_categories" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "community_moderation_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable (finalize community_settings tenant_id as primary key)
ALTER TABLE "community_settings" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "community_settings" DROP CONSTRAINT "community_settings_pkey";
ALTER TABLE "community_settings" DROP COLUMN "id";
ALTER TABLE "community_settings" ADD CONSTRAINT "community_settings_pkey" PRIMARY KEY ("tenant_id");

-- AlterTable
ALTER TABLE "community_user_restrictions" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "coupon_bundles" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "coupon_courses" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "coupon_redemptions" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "coupons" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "course_bundles" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "course_instructors" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "course_prices" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "courses" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "discussion_answers" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "discussion_follows" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "discussion_notifications" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "discussion_reactions" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "discussion_replies" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "discussion_reports" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "discussion_threads" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "email_campaign_recipients" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "email_campaigns" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "enrollment_grants" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "gamification_levels" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "import_jobs" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "instructors" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "lesson_files" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "lesson_progress" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "lessons" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "notification_recipients" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_payments" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "quiz_attempt_answers" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "quiz_attempts" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "quiz_questions" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "quizzes" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "refunds" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable (finalize settings tenant_id as primary key)
ALTER TABLE "settings" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey";
ALTER TABLE "settings" DROP COLUMN "id";
ALTER TABLE "settings" ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("tenant_id");

-- AlterTable
ALTER TABLE "user_achievements" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_activity_events" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_course_learning_time" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_daily_learning_activity" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_gamification_profiles" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_segment_snapshots" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_xp_transactions" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "xp_rules" ALTER COLUMN "tenant_id" SET NOT NULL;

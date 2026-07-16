-- DropIndex
DROP INDEX "commerce_events_bundle_id_type_idx";

-- DropIndex
DROP INDEX "commerce_events_course_id_type_idx";

-- DropIndex
DROP INDEX "commerce_events_type_created_at_idx";

-- DropIndex
DROP INDEX "commerce_events_user_id_type_idx";

-- DropIndex
DROP INDEX "community_moderation_logs_actor_id_idx";

-- DropIndex
DROP INDEX "community_moderation_logs_created_at_idx";

-- DropIndex
DROP INDEX "community_moderation_logs_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "community_moderation_logs_thread_id_idx";

-- DropIndex
DROP INDEX "community_user_restrictions_user_id_idx";

-- DropIndex
DROP INDEX "discussion_answers_author_id_idx";

-- DropIndex
DROP INDEX "discussion_answers_deleted_at_idx";

-- DropIndex
DROP INDEX "discussion_answers_hidden_at_idx";

-- DropIndex
DROP INDEX "discussion_answers_thread_id_idx";

-- DropIndex
DROP INDEX "discussion_notifications_user_id_created_at_idx";

-- DropIndex
DROP INDEX "discussion_notifications_user_id_read_at_idx";

-- DropIndex
DROP INDEX "discussion_reactions_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "discussion_replies_answer_id_idx";

-- DropIndex
DROP INDEX "discussion_replies_author_id_idx";

-- DropIndex
DROP INDEX "discussion_replies_thread_id_idx";

-- DropIndex
DROP INDEX "discussion_reports_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "discussion_reports_reporter_id_idx";

-- DropIndex
DROP INDEX "discussion_reports_status_idx";

-- DropIndex
DROP INDEX "discussion_threads_author_id_idx";

-- DropIndex
DROP INDEX "discussion_threads_category_id_idx";

-- DropIndex
DROP INDEX "discussion_threads_course_id_idx";

-- DropIndex
DROP INDEX "discussion_threads_created_at_idx";

-- DropIndex
DROP INDEX "discussion_threads_deleted_at_idx";

-- DropIndex
DROP INDEX "discussion_threads_hidden_at_idx";

-- DropIndex
DROP INDEX "discussion_threads_is_pinned_idx";

-- DropIndex
DROP INDEX "discussion_threads_is_resolved_idx";

-- DropIndex
DROP INDEX "discussion_threads_last_activity_at_idx";

-- DropIndex
DROP INDEX "discussion_threads_status_idx";

-- DropIndex
DROP INDEX "discussion_threads_thread_type_idx";

-- DropIndex
DROP INDEX "enrollments_course_id_idx";

-- DropIndex
DROP INDEX "enrollments_course_id_status_idx";

-- DropIndex
DROP INDEX "enrollments_enrolled_at_idx";

-- DropIndex
DROP INDEX "enrollments_status_idx";

-- DropIndex
DROP INDEX "lesson_progress_completed_at_idx";

-- DropIndex
DROP INDEX "lesson_progress_lesson_id_completed_at_idx";

-- DropIndex
DROP INDEX "order_items_bundle_id_idx";

-- DropIndex
DROP INDEX "order_items_course_id_idx";

-- DropIndex
DROP INDEX "orders_created_at_idx";

-- DropIndex
DROP INDEX "orders_paid_at_idx";

-- DropIndex
DROP INDEX "orders_status_idx";

-- DropIndex
DROP INDEX "orders_status_paid_at_idx";

-- DropIndex
DROP INDEX "quiz_attempts_attempted_at_idx";

-- DropIndex
DROP INDEX "quiz_attempts_quiz_id_attempted_at_idx";

-- DropIndex
DROP INDEX "quiz_attempts_quiz_id_idx";

-- DropIndex
DROP INDEX "quiz_attempts_user_id_idx";

-- DropIndex
DROP INDEX "quiz_attempts_user_id_quiz_id_idx";

-- DropIndex
DROP INDEX "refunds_order_id_idx";

-- DropIndex
DROP INDEX "refunds_refunded_at_idx";

-- DropIndex
DROP INDEX "user_activity_events_course_id_type_idx";

-- DropIndex
DROP INDEX "user_activity_events_type_created_at_idx";

-- DropIndex
DROP INDEX "user_activity_events_user_id_created_at_idx";

-- DropIndex
DROP INDEX "user_activity_events_user_id_type_idx";

-- DropIndex
DROP INDEX "user_daily_learning_activity_activity_date_idx";

-- DropIndex
DROP INDEX "user_segment_snapshots_snapshot_date_idx";

-- DropIndex
DROP INDEX "user_xp_transactions_user_id_created_at_idx";

-- AlterTable
ALTER TABLE "achievement_definitions" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "admin_audit_logs" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "bundle_courses" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "bundle_enrollments" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "bundle_prices" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "commerce_events" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "community_categories" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "community_moderation_logs" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "community_settings" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "community_user_restrictions" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "coupon_bundles" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "coupon_courses" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "coupon_redemptions" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "course_bundles" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "course_instructors" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "course_prices" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "discussion_answers" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "discussion_follows" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "discussion_notifications" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "discussion_reactions" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "discussion_replies" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "discussion_reports" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "discussion_threads" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "email_campaign_recipients" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "email_campaigns" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "enrollment_grants" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "gamification_levels" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "import_jobs" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "instructors" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "lesson_files" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "lesson_progress" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "notification_recipients" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "order_payments" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "quiz_attempt_answers" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "user_achievements" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "user_activity_events" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "user_course_learning_time" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "user_daily_learning_activity" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "user_gamification_profiles" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "user_segment_snapshots" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "user_xp_transactions" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "xp_rules" ADD COLUMN     "tenant_id" TEXT;

-- CreateIndex
CREATE INDEX "achievement_definitions_tenant_id_idx" ON "achievement_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_tenant_id_idx" ON "admin_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "bundle_courses_tenant_id_idx" ON "bundle_courses"("tenant_id");

-- CreateIndex
CREATE INDEX "bundle_enrollments_tenant_id_idx" ON "bundle_enrollments"("tenant_id");

-- CreateIndex
CREATE INDEX "bundle_prices_tenant_id_idx" ON "bundle_prices"("tenant_id");

-- CreateIndex
CREATE INDEX "cart_items_tenant_id_idx" ON "cart_items"("tenant_id");

-- CreateIndex
CREATE INDEX "carts_tenant_id_idx" ON "carts"("tenant_id");

-- CreateIndex
CREATE INDEX "certificates_tenant_id_idx" ON "certificates"("tenant_id");

-- CreateIndex
CREATE INDEX "chapters_tenant_id_idx" ON "chapters"("tenant_id");

-- CreateIndex
CREATE INDEX "commerce_events_tenant_id_type_created_at_idx" ON "commerce_events"("tenant_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "commerce_events_tenant_id_user_id_type_idx" ON "commerce_events"("tenant_id", "user_id", "type");

-- CreateIndex
CREATE INDEX "commerce_events_tenant_id_course_id_type_idx" ON "commerce_events"("tenant_id", "course_id", "type");

-- CreateIndex
CREATE INDEX "commerce_events_tenant_id_bundle_id_type_idx" ON "commerce_events"("tenant_id", "bundle_id", "type");

-- CreateIndex
CREATE INDEX "community_categories_tenant_id_idx" ON "community_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_tenant_id_actor_id_idx" ON "community_moderation_logs"("tenant_id", "actor_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_tenant_id_entity_type_entity_id_idx" ON "community_moderation_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_tenant_id_thread_id_idx" ON "community_moderation_logs"("tenant_id", "thread_id");

-- CreateIndex
CREATE INDEX "community_moderation_logs_tenant_id_created_at_idx" ON "community_moderation_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "community_user_restrictions_tenant_id_user_id_idx" ON "community_user_restrictions"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "coupon_bundles_tenant_id_idx" ON "coupon_bundles"("tenant_id");

-- CreateIndex
CREATE INDEX "coupon_courses_tenant_id_idx" ON "coupon_courses"("tenant_id");

-- CreateIndex
CREATE INDEX "coupon_redemptions_tenant_id_idx" ON "coupon_redemptions"("tenant_id");

-- CreateIndex
CREATE INDEX "coupons_tenant_id_idx" ON "coupons"("tenant_id");

-- CreateIndex
CREATE INDEX "course_bundles_tenant_id_idx" ON "course_bundles"("tenant_id");

-- CreateIndex
CREATE INDEX "course_instructors_tenant_id_idx" ON "course_instructors"("tenant_id");

-- CreateIndex
CREATE INDEX "course_prices_tenant_id_idx" ON "course_prices"("tenant_id");

-- CreateIndex
CREATE INDEX "courses_tenant_id_idx" ON "courses"("tenant_id");

-- CreateIndex
CREATE INDEX "discussion_answers_tenant_id_thread_id_idx" ON "discussion_answers"("tenant_id", "thread_id");

-- CreateIndex
CREATE INDEX "discussion_answers_tenant_id_author_id_idx" ON "discussion_answers"("tenant_id", "author_id");

-- CreateIndex
CREATE INDEX "discussion_answers_tenant_id_deleted_at_idx" ON "discussion_answers"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "discussion_answers_tenant_id_hidden_at_idx" ON "discussion_answers"("tenant_id", "hidden_at");

-- CreateIndex
CREATE INDEX "discussion_follows_tenant_id_idx" ON "discussion_follows"("tenant_id");

-- CreateIndex
CREATE INDEX "discussion_notifications_tenant_id_user_id_read_at_idx" ON "discussion_notifications"("tenant_id", "user_id", "read_at");

-- CreateIndex
CREATE INDEX "discussion_notifications_tenant_id_user_id_created_at_idx" ON "discussion_notifications"("tenant_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "discussion_reactions_tenant_id_entity_type_entity_id_idx" ON "discussion_reactions"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "discussion_replies_tenant_id_thread_id_idx" ON "discussion_replies"("tenant_id", "thread_id");

-- CreateIndex
CREATE INDEX "discussion_replies_tenant_id_answer_id_idx" ON "discussion_replies"("tenant_id", "answer_id");

-- CreateIndex
CREATE INDEX "discussion_replies_tenant_id_author_id_idx" ON "discussion_replies"("tenant_id", "author_id");

-- CreateIndex
CREATE INDEX "discussion_reports_tenant_id_entity_type_entity_id_idx" ON "discussion_reports"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "discussion_reports_tenant_id_status_idx" ON "discussion_reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "discussion_reports_tenant_id_reporter_id_idx" ON "discussion_reports"("tenant_id", "reporter_id");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_course_id_idx" ON "discussion_threads"("tenant_id", "course_id");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_category_id_idx" ON "discussion_threads"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_author_id_idx" ON "discussion_threads"("tenant_id", "author_id");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_thread_type_idx" ON "discussion_threads"("tenant_id", "thread_type");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_status_idx" ON "discussion_threads"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_created_at_idx" ON "discussion_threads"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_last_activity_at_idx" ON "discussion_threads"("tenant_id", "last_activity_at");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_is_resolved_idx" ON "discussion_threads"("tenant_id", "is_resolved");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_is_pinned_idx" ON "discussion_threads"("tenant_id", "is_pinned");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_deleted_at_idx" ON "discussion_threads"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "discussion_threads_tenant_id_hidden_at_idx" ON "discussion_threads"("tenant_id", "hidden_at");

-- CreateIndex
CREATE INDEX "email_campaign_recipients_tenant_id_idx" ON "email_campaign_recipients"("tenant_id");

-- CreateIndex
CREATE INDEX "email_campaigns_tenant_id_idx" ON "email_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "enrollment_grants_tenant_id_idx" ON "enrollment_grants"("tenant_id");

-- CreateIndex
CREATE INDEX "enrollments_tenant_id_course_id_idx" ON "enrollments"("tenant_id", "course_id");

-- CreateIndex
CREATE INDEX "enrollments_tenant_id_enrolled_at_idx" ON "enrollments"("tenant_id", "enrolled_at");

-- CreateIndex
CREATE INDEX "enrollments_tenant_id_status_idx" ON "enrollments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "enrollments_tenant_id_course_id_status_idx" ON "enrollments"("tenant_id", "course_id", "status");

-- CreateIndex
CREATE INDEX "gamification_levels_tenant_id_idx" ON "gamification_levels"("tenant_id");

-- CreateIndex
CREATE INDEX "import_jobs_tenant_id_idx" ON "import_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "instructors_tenant_id_idx" ON "instructors"("tenant_id");

-- CreateIndex
CREATE INDEX "lesson_files_tenant_id_idx" ON "lesson_files"("tenant_id");

-- CreateIndex
CREATE INDEX "lesson_progress_tenant_id_completed_at_idx" ON "lesson_progress"("tenant_id", "completed_at");

-- CreateIndex
CREATE INDEX "lesson_progress_tenant_id_lesson_id_completed_at_idx" ON "lesson_progress"("tenant_id", "lesson_id", "completed_at");

-- CreateIndex
CREATE INDEX "lessons_tenant_id_idx" ON "lessons"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_recipients_tenant_id_idx" ON "notification_recipients"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_course_id_idx" ON "order_items"("tenant_id", "course_id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_bundle_id_idx" ON "order_items"("tenant_id", "bundle_id");

-- CreateIndex
CREATE INDEX "order_payments_tenant_id_idx" ON "order_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_paid_at_idx" ON "orders"("tenant_id", "paid_at");

-- CreateIndex
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_paid_at_idx" ON "orders"("tenant_id", "status", "paid_at");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "quiz_attempt_answers_tenant_id_idx" ON "quiz_attempt_answers"("tenant_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_tenant_id_user_id_idx" ON "quiz_attempts"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_tenant_id_quiz_id_idx" ON "quiz_attempts"("tenant_id", "quiz_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_tenant_id_attempted_at_idx" ON "quiz_attempts"("tenant_id", "attempted_at");

-- CreateIndex
CREATE INDEX "quiz_attempts_tenant_id_quiz_id_attempted_at_idx" ON "quiz_attempts"("tenant_id", "quiz_id", "attempted_at");

-- CreateIndex
CREATE INDEX "quiz_attempts_tenant_id_user_id_quiz_id_idx" ON "quiz_attempts"("tenant_id", "user_id", "quiz_id");

-- CreateIndex
CREATE INDEX "quiz_questions_tenant_id_idx" ON "quiz_questions"("tenant_id");

-- CreateIndex
CREATE INDEX "quizzes_tenant_id_idx" ON "quizzes"("tenant_id");

-- CreateIndex
CREATE INDEX "refunds_tenant_id_order_id_idx" ON "refunds"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "refunds_tenant_id_refunded_at_idx" ON "refunds"("tenant_id", "refunded_at");

-- CreateIndex
CREATE INDEX "user_achievements_tenant_id_idx" ON "user_achievements"("tenant_id");

-- CreateIndex
CREATE INDEX "user_activity_events_tenant_id_user_id_type_idx" ON "user_activity_events"("tenant_id", "user_id", "type");

-- CreateIndex
CREATE INDEX "user_activity_events_tenant_id_user_id_created_at_idx" ON "user_activity_events"("tenant_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_activity_events_tenant_id_type_created_at_idx" ON "user_activity_events"("tenant_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "user_activity_events_tenant_id_course_id_type_idx" ON "user_activity_events"("tenant_id", "course_id", "type");

-- CreateIndex
CREATE INDEX "user_course_learning_time_tenant_id_idx" ON "user_course_learning_time"("tenant_id");

-- CreateIndex
CREATE INDEX "user_daily_learning_activity_tenant_id_activity_date_idx" ON "user_daily_learning_activity"("tenant_id", "activity_date");

-- CreateIndex
CREATE INDEX "user_gamification_profiles_tenant_id_idx" ON "user_gamification_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "user_segment_snapshots_tenant_id_snapshot_date_idx" ON "user_segment_snapshots"("tenant_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "user_xp_transactions_tenant_id_user_id_created_at_idx" ON "user_xp_transactions"("tenant_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "xp_rules_tenant_id_idx" ON "xp_rules"("tenant_id");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_instructors" ADD CONSTRAINT "course_instructors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_prices" ADD CONSTRAINT "course_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_files" ADD CONSTRAINT "lesson_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_grants" ADD CONSTRAINT "enrollment_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_bundles" ADD CONSTRAINT "course_bundles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_courses" ADD CONSTRAINT "bundle_courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_prices" ADD CONSTRAINT "bundle_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_enrollments" ADD CONSTRAINT "bundle_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_courses" ADD CONSTRAINT "coupon_courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_bundles" ADD CONSTRAINT "coupon_bundles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_events" ADD CONSTRAINT "commerce_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_events" ADD CONSTRAINT "user_activity_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_xp_transactions" ADD CONSTRAINT "user_xp_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gamification_profiles" ADD CONSTRAINT "user_gamification_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_levels" ADD CONSTRAINT "gamification_levels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_rules" ADD CONSTRAINT "xp_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_definitions" ADD CONSTRAINT "achievement_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_learning_activity" ADD CONSTRAINT "user_daily_learning_activity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_course_learning_time" ADD CONSTRAINT "user_course_learning_time_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_segment_snapshots" ADD CONSTRAINT "user_segment_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_categories" ADD CONSTRAINT "community_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_answers" ADD CONSTRAINT "discussion_answers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reactions" ADD CONSTRAINT "discussion_reactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_follows" ADD CONSTRAINT "discussion_follows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_user_restrictions" ADD CONSTRAINT "community_user_restrictions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_moderation_logs" ADD CONSTRAINT "community_moderation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_notifications" ADD CONSTRAINT "discussion_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_settings" ADD CONSTRAINT "community_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

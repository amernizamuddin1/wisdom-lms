-- Stage 3 scaffold: a dedicated, non-superuser application role, and
-- (inert until enabled) row-level security policies keyed off a per-
-- transaction "app.tenant_id" session setting. Both halves are prerequisites
-- for real database-level tenant isolation, but neither takes effect yet:
--   * The role has no password set (deliberately — never commit a real
--     credential to a migration file). An operator must run
--     ALTER ROLE "wisdom_lms_app" WITH PASSWORD '<secret>';
--     out-of-band (Supabase SQL editor) before DATABASE_URL can point at it.
--   * The policies below are created but RLS is never ENABLEd on any table
--     in this migration. A policy with RLS disabled is inert — Postgres
--     ignores it entirely. Enabling RLS is a separate follow-up migration,
--     run only once every environment's DATABASE_URL has been cut over to
--     this role (enabling it while still connected as the "postgres"
--     superuser would look like it worked but enforce nothing, since
--     superusers/BYPASSRLS roles ignore RLS regardless of policies).
-- See docs/multi-tenancy.md for the full rollout sequence.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wisdom_lms_app') THEN
    CREATE ROLE "wisdom_lms_app" LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO "wisdom_lms_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "wisdom_lms_app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "wisdom_lms_app";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "wisdom_lms_app";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "wisdom_lms_app";

-- Scaffolded (inert until RLS is enabled on "achievement_definitions" in a follow-up migration)
DROP POLICY IF EXISTS "achievement_definitions_tenant_isolation" ON "achievement_definitions";
CREATE POLICY "achievement_definitions_tenant_isolation" ON "achievement_definitions"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "admin_audit_logs" in a follow-up migration)
DROP POLICY IF EXISTS "admin_audit_logs_tenant_isolation" ON "admin_audit_logs";
CREATE POLICY "admin_audit_logs_tenant_isolation" ON "admin_audit_logs"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "bundle_courses" in a follow-up migration)
DROP POLICY IF EXISTS "bundle_courses_tenant_isolation" ON "bundle_courses";
CREATE POLICY "bundle_courses_tenant_isolation" ON "bundle_courses"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "bundle_enrollments" in a follow-up migration)
DROP POLICY IF EXISTS "bundle_enrollments_tenant_isolation" ON "bundle_enrollments";
CREATE POLICY "bundle_enrollments_tenant_isolation" ON "bundle_enrollments"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "bundle_prices" in a follow-up migration)
DROP POLICY IF EXISTS "bundle_prices_tenant_isolation" ON "bundle_prices";
CREATE POLICY "bundle_prices_tenant_isolation" ON "bundle_prices"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "cart_items" in a follow-up migration)
DROP POLICY IF EXISTS "cart_items_tenant_isolation" ON "cart_items";
CREATE POLICY "cart_items_tenant_isolation" ON "cart_items"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "carts" in a follow-up migration)
DROP POLICY IF EXISTS "carts_tenant_isolation" ON "carts";
CREATE POLICY "carts_tenant_isolation" ON "carts"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "certificates" in a follow-up migration)
DROP POLICY IF EXISTS "certificates_tenant_isolation" ON "certificates";
CREATE POLICY "certificates_tenant_isolation" ON "certificates"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "chapters" in a follow-up migration)
DROP POLICY IF EXISTS "chapters_tenant_isolation" ON "chapters";
CREATE POLICY "chapters_tenant_isolation" ON "chapters"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "commerce_events" in a follow-up migration)
DROP POLICY IF EXISTS "commerce_events_tenant_isolation" ON "commerce_events";
CREATE POLICY "commerce_events_tenant_isolation" ON "commerce_events"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "community_categories" in a follow-up migration)
DROP POLICY IF EXISTS "community_categories_tenant_isolation" ON "community_categories";
CREATE POLICY "community_categories_tenant_isolation" ON "community_categories"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "community_moderation_logs" in a follow-up migration)
DROP POLICY IF EXISTS "community_moderation_logs_tenant_isolation" ON "community_moderation_logs";
CREATE POLICY "community_moderation_logs_tenant_isolation" ON "community_moderation_logs"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "community_settings" in a follow-up migration)
DROP POLICY IF EXISTS "community_settings_tenant_isolation" ON "community_settings";
CREATE POLICY "community_settings_tenant_isolation" ON "community_settings"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "community_user_restrictions" in a follow-up migration)
DROP POLICY IF EXISTS "community_user_restrictions_tenant_isolation" ON "community_user_restrictions";
CREATE POLICY "community_user_restrictions_tenant_isolation" ON "community_user_restrictions"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "coupon_bundles" in a follow-up migration)
DROP POLICY IF EXISTS "coupon_bundles_tenant_isolation" ON "coupon_bundles";
CREATE POLICY "coupon_bundles_tenant_isolation" ON "coupon_bundles"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "coupon_courses" in a follow-up migration)
DROP POLICY IF EXISTS "coupon_courses_tenant_isolation" ON "coupon_courses";
CREATE POLICY "coupon_courses_tenant_isolation" ON "coupon_courses"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "coupon_redemptions" in a follow-up migration)
DROP POLICY IF EXISTS "coupon_redemptions_tenant_isolation" ON "coupon_redemptions";
CREATE POLICY "coupon_redemptions_tenant_isolation" ON "coupon_redemptions"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "coupons" in a follow-up migration)
DROP POLICY IF EXISTS "coupons_tenant_isolation" ON "coupons";
CREATE POLICY "coupons_tenant_isolation" ON "coupons"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "course_bundles" in a follow-up migration)
DROP POLICY IF EXISTS "course_bundles_tenant_isolation" ON "course_bundles";
CREATE POLICY "course_bundles_tenant_isolation" ON "course_bundles"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "course_instructors" in a follow-up migration)
DROP POLICY IF EXISTS "course_instructors_tenant_isolation" ON "course_instructors";
CREATE POLICY "course_instructors_tenant_isolation" ON "course_instructors"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "course_prices" in a follow-up migration)
DROP POLICY IF EXISTS "course_prices_tenant_isolation" ON "course_prices";
CREATE POLICY "course_prices_tenant_isolation" ON "course_prices"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "courses" in a follow-up migration)
DROP POLICY IF EXISTS "courses_tenant_isolation" ON "courses";
CREATE POLICY "courses_tenant_isolation" ON "courses"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "discussion_answers" in a follow-up migration)
DROP POLICY IF EXISTS "discussion_answers_tenant_isolation" ON "discussion_answers";
CREATE POLICY "discussion_answers_tenant_isolation" ON "discussion_answers"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "discussion_follows" in a follow-up migration)
DROP POLICY IF EXISTS "discussion_follows_tenant_isolation" ON "discussion_follows";
CREATE POLICY "discussion_follows_tenant_isolation" ON "discussion_follows"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "discussion_notifications" in a follow-up migration)
DROP POLICY IF EXISTS "discussion_notifications_tenant_isolation" ON "discussion_notifications";
CREATE POLICY "discussion_notifications_tenant_isolation" ON "discussion_notifications"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "discussion_reactions" in a follow-up migration)
DROP POLICY IF EXISTS "discussion_reactions_tenant_isolation" ON "discussion_reactions";
CREATE POLICY "discussion_reactions_tenant_isolation" ON "discussion_reactions"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "discussion_replies" in a follow-up migration)
DROP POLICY IF EXISTS "discussion_replies_tenant_isolation" ON "discussion_replies";
CREATE POLICY "discussion_replies_tenant_isolation" ON "discussion_replies"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "discussion_reports" in a follow-up migration)
DROP POLICY IF EXISTS "discussion_reports_tenant_isolation" ON "discussion_reports";
CREATE POLICY "discussion_reports_tenant_isolation" ON "discussion_reports"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "discussion_threads" in a follow-up migration)
DROP POLICY IF EXISTS "discussion_threads_tenant_isolation" ON "discussion_threads";
CREATE POLICY "discussion_threads_tenant_isolation" ON "discussion_threads"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "email_campaign_recipients" in a follow-up migration)
DROP POLICY IF EXISTS "email_campaign_recipients_tenant_isolation" ON "email_campaign_recipients";
CREATE POLICY "email_campaign_recipients_tenant_isolation" ON "email_campaign_recipients"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "email_campaigns" in a follow-up migration)
DROP POLICY IF EXISTS "email_campaigns_tenant_isolation" ON "email_campaigns";
CREATE POLICY "email_campaigns_tenant_isolation" ON "email_campaigns"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "enrollment_grants" in a follow-up migration)
DROP POLICY IF EXISTS "enrollment_grants_tenant_isolation" ON "enrollment_grants";
CREATE POLICY "enrollment_grants_tenant_isolation" ON "enrollment_grants"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "enrollments" in a follow-up migration)
DROP POLICY IF EXISTS "enrollments_tenant_isolation" ON "enrollments";
CREATE POLICY "enrollments_tenant_isolation" ON "enrollments"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "gamification_levels" in a follow-up migration)
DROP POLICY IF EXISTS "gamification_levels_tenant_isolation" ON "gamification_levels";
CREATE POLICY "gamification_levels_tenant_isolation" ON "gamification_levels"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "import_jobs" in a follow-up migration)
DROP POLICY IF EXISTS "import_jobs_tenant_isolation" ON "import_jobs";
CREATE POLICY "import_jobs_tenant_isolation" ON "import_jobs"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "instructors" in a follow-up migration)
DROP POLICY IF EXISTS "instructors_tenant_isolation" ON "instructors";
CREATE POLICY "instructors_tenant_isolation" ON "instructors"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "lesson_files" in a follow-up migration)
DROP POLICY IF EXISTS "lesson_files_tenant_isolation" ON "lesson_files";
CREATE POLICY "lesson_files_tenant_isolation" ON "lesson_files"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "lesson_progress" in a follow-up migration)
DROP POLICY IF EXISTS "lesson_progress_tenant_isolation" ON "lesson_progress";
CREATE POLICY "lesson_progress_tenant_isolation" ON "lesson_progress"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "lessons" in a follow-up migration)
DROP POLICY IF EXISTS "lessons_tenant_isolation" ON "lessons";
CREATE POLICY "lessons_tenant_isolation" ON "lessons"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "notification_recipients" in a follow-up migration)
DROP POLICY IF EXISTS "notification_recipients_tenant_isolation" ON "notification_recipients";
CREATE POLICY "notification_recipients_tenant_isolation" ON "notification_recipients"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "notifications" in a follow-up migration)
DROP POLICY IF EXISTS "notifications_tenant_isolation" ON "notifications";
CREATE POLICY "notifications_tenant_isolation" ON "notifications"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "order_items" in a follow-up migration)
DROP POLICY IF EXISTS "order_items_tenant_isolation" ON "order_items";
CREATE POLICY "order_items_tenant_isolation" ON "order_items"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "order_payments" in a follow-up migration)
DROP POLICY IF EXISTS "order_payments_tenant_isolation" ON "order_payments";
CREATE POLICY "order_payments_tenant_isolation" ON "order_payments"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "orders" in a follow-up migration)
DROP POLICY IF EXISTS "orders_tenant_isolation" ON "orders";
CREATE POLICY "orders_tenant_isolation" ON "orders"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "payments" in a follow-up migration)
DROP POLICY IF EXISTS "payments_tenant_isolation" ON "payments";
CREATE POLICY "payments_tenant_isolation" ON "payments"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "quiz_attempt_answers" in a follow-up migration)
DROP POLICY IF EXISTS "quiz_attempt_answers_tenant_isolation" ON "quiz_attempt_answers";
CREATE POLICY "quiz_attempt_answers_tenant_isolation" ON "quiz_attempt_answers"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "quiz_attempts" in a follow-up migration)
DROP POLICY IF EXISTS "quiz_attempts_tenant_isolation" ON "quiz_attempts";
CREATE POLICY "quiz_attempts_tenant_isolation" ON "quiz_attempts"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "quiz_questions" in a follow-up migration)
DROP POLICY IF EXISTS "quiz_questions_tenant_isolation" ON "quiz_questions";
CREATE POLICY "quiz_questions_tenant_isolation" ON "quiz_questions"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "quizzes" in a follow-up migration)
DROP POLICY IF EXISTS "quizzes_tenant_isolation" ON "quizzes";
CREATE POLICY "quizzes_tenant_isolation" ON "quizzes"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "refunds" in a follow-up migration)
DROP POLICY IF EXISTS "refunds_tenant_isolation" ON "refunds";
CREATE POLICY "refunds_tenant_isolation" ON "refunds"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "settings" in a follow-up migration)
DROP POLICY IF EXISTS "settings_tenant_isolation" ON "settings";
CREATE POLICY "settings_tenant_isolation" ON "settings"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "user_achievements" in a follow-up migration)
DROP POLICY IF EXISTS "user_achievements_tenant_isolation" ON "user_achievements";
CREATE POLICY "user_achievements_tenant_isolation" ON "user_achievements"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "user_activity_events" in a follow-up migration)
DROP POLICY IF EXISTS "user_activity_events_tenant_isolation" ON "user_activity_events";
CREATE POLICY "user_activity_events_tenant_isolation" ON "user_activity_events"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "user_course_learning_time" in a follow-up migration)
DROP POLICY IF EXISTS "user_course_learning_time_tenant_isolation" ON "user_course_learning_time";
CREATE POLICY "user_course_learning_time_tenant_isolation" ON "user_course_learning_time"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "user_daily_learning_activity" in a follow-up migration)
DROP POLICY IF EXISTS "user_daily_learning_activity_tenant_isolation" ON "user_daily_learning_activity";
CREATE POLICY "user_daily_learning_activity_tenant_isolation" ON "user_daily_learning_activity"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "user_gamification_profiles" in a follow-up migration)
DROP POLICY IF EXISTS "user_gamification_profiles_tenant_isolation" ON "user_gamification_profiles";
CREATE POLICY "user_gamification_profiles_tenant_isolation" ON "user_gamification_profiles"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "user_segment_snapshots" in a follow-up migration)
DROP POLICY IF EXISTS "user_segment_snapshots_tenant_isolation" ON "user_segment_snapshots";
CREATE POLICY "user_segment_snapshots_tenant_isolation" ON "user_segment_snapshots"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "user_xp_transactions" in a follow-up migration)
DROP POLICY IF EXISTS "user_xp_transactions_tenant_isolation" ON "user_xp_transactions";
CREATE POLICY "user_xp_transactions_tenant_isolation" ON "user_xp_transactions"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Scaffolded (inert until RLS is enabled on "xp_rules" in a follow-up migration)
DROP POLICY IF EXISTS "xp_rules_tenant_isolation" ON "xp_rules";
CREATE POLICY "xp_rules_tenant_isolation" ON "xp_rules"
  USING ("tenant_id" = current_setting('app.tenant_id', true));

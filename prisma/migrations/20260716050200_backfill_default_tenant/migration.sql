-- Data backfill: create the default "WisdomQuant" tenant and attach every
-- pre-existing row to it, so no data is orphaned or lost by the tenantId
-- columns added in the previous migration. This uses a fixed, well-known
-- tenant id (rather than gen_random_uuid()) so this migration is idempotent
-- and safe to re-run.
INSERT INTO "tenants" ("id", "name", "slug", "subdomain", "status", "created_at", "updated_at")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'WisdomQuant',
  'wisdomquant',
  'wisdomquant',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

UPDATE "achievement_definitions" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "admin_audit_logs" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "bundle_courses" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "bundle_enrollments" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "bundle_prices" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "cart_items" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "carts" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "certificates" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "chapters" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "commerce_events" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "community_categories" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "community_moderation_logs" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "community_settings" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "community_user_restrictions" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "coupon_bundles" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "coupon_courses" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "coupon_redemptions" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "coupons" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "course_bundles" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "course_instructors" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "course_prices" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "courses" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "discussion_answers" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "discussion_follows" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "discussion_notifications" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "discussion_reactions" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "discussion_replies" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "discussion_reports" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "discussion_threads" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "email_campaign_recipients" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "email_campaigns" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "enrollment_grants" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "enrollments" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "gamification_levels" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "import_jobs" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "instructors" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "lesson_files" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "lesson_progress" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "lessons" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "notification_recipients" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "notifications" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "order_items" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "order_payments" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "orders" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "payments" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "quiz_attempt_answers" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "quiz_attempts" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "quiz_questions" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "quizzes" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "refunds" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "settings" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "user_achievements" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "user_activity_events" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "user_course_learning_time" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "user_daily_learning_activity" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "user_gamification_profiles" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "user_segment_snapshots" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "user_xp_transactions" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "xp_rules" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;

-- Backfill tenant_memberships from every existing users.role (the legacy
-- global Role column), attaching every current user to the default tenant
-- with their existing role. users.role itself is left in place for now.
INSERT INTO "tenant_memberships" ("id", "tenant_id", "user_id", "role", "status", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  "id",
  "role",
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users"
ON CONFLICT ("tenant_id", "user_id") DO NOTHING;

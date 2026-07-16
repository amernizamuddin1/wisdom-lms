-- Seeds the default Community categories + the CommunitySettings singleton,
-- mirroring the Settings singleton ("main") id convention and the raw-SQL
-- seed pattern used by 20260714182044_seed_gamification_defaults.
-- createdById is set to the earliest ADMIN user found (deployment always has
-- at least one by this point); if none exists yet, categories are skipped
-- and can be created via the admin UI once an admin account exists.

DO $$
DECLARE
  admin_id TEXT;
BEGIN
  SELECT id INTO admin_id FROM "users" WHERE "role" = 'ADMIN' ORDER BY "created_at" ASC LIMIT 1;

  IF admin_id IS NOT NULL THEN
    INSERT INTO "community_categories" ("id", "name", "slug", "description", "display_order", "is_active", "visibility_type", "posting_permission", "created_by", "created_at", "updated_at") VALUES
      (gen_random_uuid(), 'General Discussion', 'general-discussion', 'Open conversation about anything learning-related.', 1, true, 'PUBLIC', 'ANYONE', admin_id, now(), now()),
      (gen_random_uuid(), 'Q&A', 'q-and-a', 'Ask questions and get help from the community.', 2, true, 'PUBLIC', 'ANYONE', admin_id, now(), now()),
      (gen_random_uuid(), 'Announcements', 'announcements', 'Official announcements from the team.', 3, true, 'PUBLIC', 'RESTRICTED', admin_id, now(), now()),
      (gen_random_uuid(), 'Course Feedback', 'course-feedback', 'Share feedback and suggestions on courses.', 4, true, 'PUBLIC', 'ANYONE', admin_id, now(), now()),
      (gen_random_uuid(), 'Career & Industry', 'career-and-industry', 'Discuss career paths and industry trends.', 5, true, 'PUBLIC', 'ANYONE', admin_id, now(), now()),
      (gen_random_uuid(), 'Study Groups', 'study-groups', 'Find and organize study groups with peers.', 6, true, 'PUBLIC', 'ANYONE', admin_id, now(), now()),
      (gen_random_uuid(), 'Off Topic', 'off-topic', 'Casual, non-course-related conversation.', 7, true, 'PUBLIC', 'ANYONE', admin_id, now(), now());
  END IF;
END $$;

INSERT INTO "community_settings" ("id", "community_enabled", "course_discussions_enabled", "allow_global_discussion_creation", "allow_course_questions", "allow_likes", "allow_reporting", "allow_image_uploads", "max_image_size_mb", "allowed_image_formats", "allow_post_editing", "allow_answer_editing", "allow_reply_editing", "auto_follow_on_participation", "default_sort_order", "announcement_creator_role", "updated_at")
VALUES ('main', true, true, true, true, true, true, true, 5, ARRAY['jpg','jpeg','png','webp'], true, true, true, true, 'LATEST', 'ADMIN_ONLY', now())
ON CONFLICT ("id") DO NOTHING;

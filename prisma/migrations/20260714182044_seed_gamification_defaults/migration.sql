-- Seeds the default gamification configuration (levels, XP rules, badge
-- catalogue) so the engine is functional before the Phase 4 admin UI exists
-- to edit these tables. All rows remain editable later without a schema
-- change — this is data, not code.

-- Levels
INSERT INTO "gamification_levels" ("id", "order", "name", "min_xp", "is_active") VALUES
  (gen_random_uuid(), 1, 'Explorer', 0, true),
  (gen_random_uuid(), 2, 'Learner', 250, true),
  (gen_random_uuid(), 3, 'Practitioner', 750, true),
  (gen_random_uuid(), 4, 'Builder', 1500, true),
  (gen_random_uuid(), 5, 'Specialist', 3000, true),
  (gen_random_uuid(), 6, 'Expert', 5000, true),
  (gen_random_uuid(), 7, 'Mentor', 8000, true),
  (gen_random_uuid(), 8, 'Master', 12000, true);

-- XP rules. DISCUSSION_*/ASSIGNMENT_* rules are seeded inactive-in-practice
-- (no caller exists yet — see plan's "wire dormant" decision) but fully
-- configured so a future discussion/assignment feature only needs to call
-- recordActivityEvent(), no schema or rule changes required.
INSERT INTO "xp_rules" ("code", "label", "description", "xp_amount", "is_active", "daily_cap", "qualifying_condition_json", "updated_at") VALUES
  ('LESSON_COMPLETED', 'Lesson completed', 'Awarded once per lesson the first time it is marked complete.', 10, true, NULL, NULL, now()),
  ('MODULE_COMPLETED', 'Module completed', 'Awarded once per module (chapter) the first time all its lessons/quizzes are complete.', 50, true, NULL, NULL, now()),
  ('COURSE_COMPLETED', 'Course completed', 'Awarded once per course the first time it is fully completed.', 250, true, NULL, NULL, now()),
  ('QUIZ_PASSED', 'Quiz passed', 'Awarded once per quiz the first time it is passed.', 50, true, NULL, NULL, now()),
  ('QUIZ_HIGH_SCORE', 'Quiz scored 90% or higher', 'Tops up quiz XP to this tier the first time a quiz is scored 90%+.', 75, true, NULL, '{"minScorePercent": 90}', now()),
  ('QUIZ_PERFECT_SCORE', 'Quiz scored 100%', 'Tops up quiz XP to this tier the first time a quiz is scored 100%.', 100, true, NULL, '{"minScorePercent": 100}', now()),
  ('ASSIGNMENT_SUBMITTED', 'Assignment submitted', 'Reserved for a future assignment-submission feature.', 50, true, NULL, NULL, now()),
  ('ASSIGNMENT_COMPLETED', 'Assignment completed', 'Reserved for a future assignment-submission feature.', 100, true, NULL, NULL, now()),
  ('DISCUSSION_FIRST_POST', 'First discussion post', 'Reserved for a future discussion/community feature.', 25, true, NULL, NULL, now()),
  ('DISCUSSION_POST', 'Meaningful discussion post', 'Reserved for a future discussion/community feature.', 10, true, 3, '{"minContentLength": 40}', now()),
  ('DISCUSSION_REPLY', 'Meaningful discussion reply', 'Reserved for a future discussion/community feature.', 5, true, 5, '{"minContentLength": 40}', now()),
  ('DISCUSSION_HELPFUL_REACTION_RECEIVED', 'Helpful reaction received', 'Reserved for a future discussion/community feature.', 2, true, NULL, NULL, now()),
  ('DISCUSSION_ANSWER_HELPFUL', 'Answer marked helpful', 'Reserved for a future discussion/community feature.', 25, true, NULL, NULL, now()),
  ('DISCUSSION_ANSWER_ACCEPTED', 'Answer accepted', 'Reserved for a future discussion/community feature.', 50, true, NULL, NULL, now()),
  ('PROFILE_COMPLETED', 'Profile completed', 'Awarded once when all required profile fields are filled in.', 25, true, NULL, NULL, now()),
  ('CERTIFICATE_EARNED', 'Certificate earned', 'Awarded once per certificate issued.', 100, true, NULL, NULL, now());

-- Achievement catalogue (32 badges). assetPath follows the recommended
-- /public/assets/badges/<category>/<id>.png structure from the spec — files
-- don't exist yet; the Achievements page must render a graceful placeholder
-- when an asset 404s, never a broken image.
INSERT INTO "achievement_definitions" ("id", "name", "description", "category", "unlock_criteria_json", "xp_reward", "asset_path", "is_active", "display_order", "is_hidden", "created_at", "updated_at") VALUES
  -- Learning
  ('first-step', 'First Step', 'Complete your first lesson.', 'LEARNING', '{"kind": "LESSON_COUNT", "threshold": 1}', 0, '/assets/badges/learning/first-step.png', true, 1, false, now(), now()),
  ('module-complete', 'Module Complete', 'Complete your first module.', 'LEARNING', '{"kind": "MODULE_COUNT", "threshold": 1}', 0, '/assets/badges/learning/module-complete.png', true, 2, false, now(), now()),
  ('first-course', 'First Course', 'Complete your first course.', 'LEARNING', '{"kind": "COURSE_COUNT", "threshold": 1}', 0, '/assets/badges/learning/first-course.png', true, 3, false, now(), now()),
  ('triple-crown', 'Triple Crown', 'Complete 3 courses.', 'LEARNING', '{"kind": "COURSE_COUNT", "threshold": 3}', 0, '/assets/badges/learning/triple-crown.png', true, 4, false, now(), now()),
  ('five-courses', 'Five Courses', 'Complete 5 courses.', 'LEARNING', '{"kind": "COURSE_COUNT", "threshold": 5}', 0, '/assets/badges/learning/five-courses.png', true, 5, false, now(), now()),
  ('ten-courses', 'Ten Courses', 'Complete 10 courses.', 'LEARNING', '{"kind": "COURSE_COUNT", "threshold": 10}', 0, '/assets/badges/learning/ten-courses.png', true, 6, false, now(), now()),
  -- Mastery
  ('first-quiz', 'First Quiz', 'Pass your first quiz.', 'MASTERY', '{"kind": "QUIZ_PASS_COUNT", "threshold": 1}', 0, '/assets/badges/mastery/first-quiz.png', true, 7, false, now(), now()),
  ('perfect-score', 'Perfect Score', 'Score 100% on a quiz.', 'MASTERY', '{"kind": "QUIZ_PERFECT_COUNT", "threshold": 1}', 0, '/assets/badges/mastery/perfect-score.png', true, 8, false, now(), now()),
  ('high-achiever', 'High Achiever', 'Score 90% or higher on a quiz.', 'MASTERY', '{"kind": "QUIZ_HIGH_SCORE_COUNT", "threshold": 1}', 0, '/assets/badges/mastery/high-achiever.png', true, 9, false, now(), now()),
  ('quiz-master', 'Quiz Master', 'Pass 10 quizzes.', 'MASTERY', '{"kind": "QUIZ_PASS_COUNT", "threshold": 10}', 0, '/assets/badges/mastery/quiz-master.png', true, 10, false, now(), now()),
  ('first-attempt-ace', 'First-Attempt Ace', 'Score 90% or higher on the first attempt.', 'MASTERY', '{"kind": "QUIZ_FIRST_ATTEMPT_HIGH", "threshold": 1}', 0, '/assets/badges/mastery/first-attempt-ace.png', true, 11, false, now(), now()),
  -- Consistency
  ('three-day-momentum', '3-Day Momentum', 'Reach a 3-day learning streak.', 'CONSISTENCY', '{"kind": "STREAK_DAYS", "threshold": 3}', 0, '/assets/badges/consistency/three-day-momentum.png', true, 12, false, now(), now()),
  ('seven-day-streak', '7-Day Streak', 'Reach a 7-day learning streak.', 'CONSISTENCY', '{"kind": "STREAK_DAYS", "threshold": 7}', 0, '/assets/badges/consistency/seven-day-streak.png', true, 13, false, now(), now()),
  ('fourteen-day-commitment', '14-Day Commitment', 'Reach a 14-day learning streak.', 'CONSISTENCY', '{"kind": "STREAK_DAYS", "threshold": 14}', 0, '/assets/badges/consistency/fourteen-day-commitment.png', true, 14, false, now(), now()),
  ('thirty-day-discipline', '30-Day Discipline', 'Reach a 30-day learning streak.', 'CONSISTENCY', '{"kind": "STREAK_DAYS", "threshold": 30}', 0, '/assets/badges/consistency/thirty-day-discipline.png', true, 15, false, now(), now()),
  ('sixty-day-consistency', '60-Day Consistency', 'Reach a 60-day learning streak.', 'CONSISTENCY', '{"kind": "STREAK_DAYS", "threshold": 60}', 0, '/assets/badges/consistency/sixty-day-consistency.png', true, 16, false, now(), now()),
  ('hundred-day-unstoppable', '100-Day Unstoppable', 'Reach a 100-day learning streak.', 'CONSISTENCY', '{"kind": "STREAK_DAYS", "threshold": 100}', 0, '/assets/badges/consistency/hundred-day-unstoppable.png', true, 17, false, now(), now()),
  -- Community (dormant — no discussion feature exists yet)
  ('first-voice', 'First Voice', 'Create your first meaningful discussion post.', 'COMMUNITY', '{"kind": "CONTRIBUTION_COUNT", "threshold": 1}', 0, '/assets/badges/community/first-voice.png', true, 18, false, now(), now()),
  ('contributor', 'Contributor', 'Create 10 meaningful contributions.', 'COMMUNITY', '{"kind": "CONTRIBUTION_COUNT", "threshold": 10}', 0, '/assets/badges/community/contributor.png', true, 19, false, now(), now()),
  ('helpful-peer', 'Helpful Peer', 'Receive 10 helpful reactions.', 'COMMUNITY', '{"kind": "HELPFUL_REACTIONS_COUNT", "threshold": 10}', 0, '/assets/badges/community/helpful-peer.png', true, 20, false, now(), now()),
  ('trusted-answer', 'Trusted Answer', 'Have one answer marked helpful or accepted.', 'COMMUNITY', '{"kind": "HELPFUL_ANSWER_COUNT", "threshold": 1}', 0, '/assets/badges/community/trusted-answer.png', true, 21, false, now(), now()),
  ('community-champion', 'Community Champion', 'Receive 50 helpful reactions.', 'COMMUNITY', '{"kind": "HELPFUL_REACTIONS_COUNT", "threshold": 50}', 0, '/assets/badges/community/community-champion.png', true, 22, false, now(), now()),
  ('mentor', 'Mentor', 'Have 10 answers marked helpful or accepted.', 'COMMUNITY', '{"kind": "HELPFUL_ANSWER_COUNT", "threshold": 10}', 0, '/assets/badges/community/mentor.png', true, 23, false, now(), now()),
  -- Learning Time
  ('first-hour', 'First Hour', 'Complete 1 hour of genuine learning time.', 'LEARNING_TIME', '{"kind": "LEARNING_HOURS", "threshold": 1}', 0, '/assets/badges/learning-time/first-hour.png', true, 24, false, now(), now()),
  ('ten-hours', '10 Hours', 'Complete 10 hours of genuine learning time.', 'LEARNING_TIME', '{"kind": "LEARNING_HOURS", "threshold": 10}', 0, '/assets/badges/learning-time/ten-hours.png', true, 25, false, now(), now()),
  ('twenty-five-hours', '25 Hours', 'Complete 25 hours of genuine learning time.', 'LEARNING_TIME', '{"kind": "LEARNING_HOURS", "threshold": 25}', 0, '/assets/badges/learning-time/twenty-five-hours.png', true, 26, false, now(), now()),
  ('fifty-hours', '50 Hours', 'Complete 50 hours of genuine learning time.', 'LEARNING_TIME', '{"kind": "LEARNING_HOURS", "threshold": 50}', 0, '/assets/badges/learning-time/fifty-hours.png', true, 27, false, now(), now()),
  ('hundred-hours', '100 Hours', 'Complete 100 hours of genuine learning time.', 'LEARNING_TIME', '{"kind": "LEARNING_HOURS", "threshold": 100}', 0, '/assets/badges/learning-time/hundred-hours.png', true, 28, false, now(), now()),
  -- Special Achievements
  ('fast-starter', 'Fast Starter', 'Complete your first module within 24 hours of joining.', 'SPECIAL', '{"kind": "FAST_STARTER", "withinHours": 24}', 0, '/assets/badges/special/fast-starter.png', true, 29, false, now(), now()),
  ('weekend-warrior', 'Weekend Warrior', 'Learn on 4 consecutive weekends.', 'SPECIAL', '{"kind": "WEEKEND_STREAK", "threshold": 4}', 0, '/assets/badges/special/weekend-warrior.png', true, 30, false, now(), now()),
  ('night-owl', 'Night Owl', 'Complete 10 qualifying learning sessions after 9 PM.', 'SPECIAL', '{"kind": "NIGHT_SESSIONS", "threshold": 10, "afterHour": 21}', 0, '/assets/badges/special/night-owl.png', true, 31, true, now(), now()),
  ('early-adopter', 'Early Adopter', 'One of WisdomQuant''s earliest learners.', 'SPECIAL', '{"kind": "EARLY_ADOPTER"}', 0, '/assets/badges/special/early-adopter.png', true, 32, true, now(), now());

-- Grandfather-award "Early Adopter" to every account that already existed
-- when this feature shipped (the sensible default for an admin-cutoff-date
-- criteria with no admin UI yet to set one).
INSERT INTO "user_achievements" ("id", "user_id", "achievement_id", "earned_at", "viewed_at")
SELECT gen_random_uuid(), u."id", 'early-adopter', now(), NULL
FROM "users" u
WHERE u."created_at" < now();

-- Ensure every existing user has a gamification profile row so reads never
-- need a null-check special case.
INSERT INTO "user_gamification_profiles" ("user_id", "total_xp", "current_streak", "longest_streak", "total_active_days", "total_learning_time_seconds", "total_video_watch_time_seconds", "updated_at")
SELECT u."id", 0, 0, 0, 0, 0, 0, now()
FROM "users" u
ON CONFLICT ("user_id") DO NOTHING;

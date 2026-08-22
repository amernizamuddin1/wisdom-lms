-- Historical completion snapshot from a legacy platform (e.g. a Wisdom Pond
-- CSV import), captured at import time. Not derived from LessonProgress/
-- QuizAttempt — the enrolled course may have no real lessons yet. All columns
-- stay NULL for every enrollment that wasn't legacy-imported.
ALTER TABLE "enrollments" ADD COLUMN "legacy_progress_percent" INTEGER;
ALTER TABLE "enrollments" ADD COLUMN "legacy_lessons_completed" INTEGER;
ALTER TABLE "enrollments" ADD COLUMN "legacy_lessons_total" INTEGER;
ALTER TABLE "enrollments" ADD COLUMN "legacy_quizzes_completed" INTEGER;
ALTER TABLE "enrollments" ADD COLUMN "legacy_quizzes_total" INTEGER;

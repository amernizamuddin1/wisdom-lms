-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK');

-- AlterTable: add new columns first (nullable / defaulted), backfill from the
-- column being dropped, then drop it. Preserves existing quiz_questions rows
-- instead of the plain DROP COLUMN Prisma would generate by default.
ALTER TABLE "quiz_questions"
  ADD COLUMN     "correct_answer_text" TEXT,
  ADD COLUMN     "correct_options_json" JSONB,
  ADD COLUMN     "question_type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
  ALTER COLUMN "options_json" DROP NOT NULL;

UPDATE "quiz_questions"
  SET "correct_options_json" = to_jsonb(ARRAY["correct_option"])
  WHERE "correct_option" IS NOT NULL;

ALTER TABLE "quiz_questions" DROP COLUMN "correct_option";

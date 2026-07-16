-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'AUDIO', 'TEXT');

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "lesson_type" "LessonType" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN     "text_content" TEXT;

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "access_duration_months" INTEGER,
ADD COLUMN     "certificate_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "duration_minutes" INTEGER,
ADD COLUMN     "is_permanent_access" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "level" "CourseLevel",
ADD COLUMN     "materials_included" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preview_video_source_type" "VideoSource",
ADD COLUMN     "preview_video_url" TEXT,
ADD COLUMN     "short_description" TEXT,
ADD COLUMN     "target_audience" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "instructors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_instructors" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "course_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_instructors_course_id_instructor_id_key" ON "course_instructors"("course_id", "instructor_id");

-- AddForeignKey
ALTER TABLE "course_instructors" ADD CONSTRAINT "course_instructors_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_instructors" ADD CONSTRAINT "course_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

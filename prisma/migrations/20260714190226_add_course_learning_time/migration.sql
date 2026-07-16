-- CreateTable
CREATE TABLE "user_course_learning_time" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "learning_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "video_watch_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_course_learning_time_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_course_learning_time_user_id_course_id_key" ON "user_course_learning_time"("user_id", "course_id");

-- AddForeignKey
ALTER TABLE "user_course_learning_time" ADD CONSTRAINT "user_course_learning_time_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

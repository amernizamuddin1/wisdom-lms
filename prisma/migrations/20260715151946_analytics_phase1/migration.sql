-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "analytics_active_window_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "analytics_at_risk_days" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "analytics_dormant_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "analytics_slowing_down_days" INTEGER NOT NULL DEFAULT 7;

-- CreateIndex
CREATE INDEX "enrollments_course_id_idx" ON "enrollments"("course_id");

-- CreateIndex
CREATE INDEX "enrollments_enrolled_at_idx" ON "enrollments"("enrolled_at");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE INDEX "lesson_progress_completed_at_idx" ON "lesson_progress"("completed_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_paid_at_idx" ON "orders"("paid_at");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_idx" ON "quiz_attempts"("user_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_attempted_at_idx" ON "quiz_attempts"("attempted_at");

-- CreateIndex
CREATE INDEX "user_activity_events_type_created_at_idx" ON "user_activity_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "user_daily_learning_activity_activity_date_idx" ON "user_daily_learning_activity"("activity_date");

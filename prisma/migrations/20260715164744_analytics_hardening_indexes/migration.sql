-- CreateIndex
CREATE INDEX "enrollments_course_id_status_idx" ON "enrollments"("course_id", "status");

-- CreateIndex
CREATE INDEX "lesson_progress_lesson_id_completed_at_idx" ON "lesson_progress"("lesson_id", "completed_at");

-- CreateIndex
CREATE INDEX "orders_status_paid_at_idx" ON "orders"("status", "paid_at");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_attempted_at_idx" ON "quiz_attempts"("quiz_id", "attempted_at");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_quiz_id_idx" ON "quiz_attempts"("user_id", "quiz_id");

-- CreateIndex
CREATE INDEX "user_activity_events_course_id_type_idx" ON "user_activity_events"("course_id", "type");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE INDEX "courses_tenant_id_status_created_at_idx"
ON "courses"("tenant_id", "status", "created_at");

CREATE INDEX "enrollments_tenant_id_user_id_status_enrolled_at_idx"
ON "enrollments"("tenant_id", "user_id", "status", "enrolled_at");

CREATE INDEX "course_bundles_tenant_id_status_created_at_idx"
ON "course_bundles"("tenant_id", "status", "created_at");

CREATE INDEX "notification_recipients_tenant_id_user_id_read_at_delivered_at_idx"
ON "notification_recipients"("tenant_id", "user_id", "read_at", "delivered_at");

CREATE INDEX "user_achievements_tenant_id_user_id_earned_at_idx"
ON "user_achievements"("tenant_id", "user_id", "earned_at");

-- Backfills EnrollmentGrant rows for every Enrollment that predates the
-- Subscriber Management feature. Without this, pre-existing course access
-- (granted before enrollment_grants existed) is invisible on the admin
-- subscriber detail page and can't be revoked through the new UI, even
-- though the parent Enrollment row is still the one gating actual access.
INSERT INTO "enrollment_grants" (
  "id", "enrollment_id", "status", "source", "source_bundle_id", "source_order_id",
  "granted_at", "access_start_at", "access_end_at", "access_duration_months", "is_permanent"
)
SELECT
  gen_random_uuid(), e."id", e."status", e."source", e."source_bundle_id", e."source_order_id",
  e."enrolled_at", e."access_start_at", e."access_end_at", e."access_duration_months", e."is_permanent"
FROM "enrollments" e
WHERE NOT EXISTS (
  SELECT 1 FROM "enrollment_grants" g WHERE g."enrollment_id" = e."id"
);

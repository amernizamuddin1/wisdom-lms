-- The (userId, snapshotDate) unique constraint on user_segment_snapshots had
-- no tenantId in it, even though the table carries tenant_id. A single
-- global user who belongs to two tenants collides on this constraint the
-- second time the segment-snapshot cron writes their row for the same day
-- under a different tenant, throwing the whole per-tenant $transaction.
-- Widening the constraint to (tenant_id, user_id, snapshot_date) makes one
-- snapshot row per user *per tenant* per day, matching how every other
-- tenant-scoped table in this schema is uniqued.
DROP INDEX "user_segment_snapshots_user_id_snapshot_date_key";

CREATE UNIQUE INDEX "user_segment_snapshots_tenant_id_user_id_snapshot_date_key" ON "user_segment_snapshots"("tenant_id", "user_id", "snapshot_date");

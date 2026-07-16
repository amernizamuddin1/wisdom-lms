-- CreateEnum
CREATE TYPE "LearnerSegment" AS ENUM ('HIGHLY_ENGAGED', 'ACTIVE', 'SLOWING_DOWN', 'AT_RISK', 'DORMANT');

-- CreateTable
CREATE TABLE "user_segment_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "segment" "LearnerSegment" NOT NULL,
    "snapshot_date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_segment_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_segment_snapshots_snapshot_date_idx" ON "user_segment_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_segment_snapshots_user_id_snapshot_date_key" ON "user_segment_snapshots"("user_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "user_segment_snapshots" ADD CONSTRAINT "user_segment_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CommerceEventType" AS ENUM ('PRODUCT_VIEWED', 'ADDED_TO_CART', 'CHECKOUT_STARTED', 'PAYMENT_INITIATED');

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "commerce_discount_expiry_alert_days" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "reason" TEXT,
    "gateway_refund_id" TEXT,
    "issued_by_admin_id" TEXT NOT NULL,
    "refunded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "CommerceEventType" NOT NULL,
    "course_id" TEXT,
    "bundle_id" TEXT,
    "order_id" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "refunds_refunded_at_idx" ON "refunds"("refunded_at");

-- CreateIndex
CREATE INDEX "commerce_events_type_created_at_idx" ON "commerce_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "commerce_events_user_id_type_idx" ON "commerce_events"("user_id", "type");

-- CreateIndex
CREATE INDEX "commerce_events_course_id_type_idx" ON "commerce_events"("course_id", "type");

-- CreateIndex
CREATE INDEX "commerce_events_bundle_id_type_idx" ON "commerce_events"("bundle_id", "type");

-- CreateIndex
CREATE INDEX "order_items_course_id_idx" ON "order_items"("course_id");

-- CreateIndex
CREATE INDEX "order_items_bundle_id_idx" ON "order_items"("bundle_id");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_issued_by_admin_id_fkey" FOREIGN KEY ("issued_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_events" ADD CONSTRAINT "commerce_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

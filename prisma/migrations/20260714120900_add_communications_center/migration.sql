-- CreateEnum
CREATE TYPE "CommunicationAudienceType" AS ENUM ('ALL_USERS', 'ALL_ENROLLED', 'COURSES', 'BUNDLES', 'MANUAL', 'MIXED');

-- CreateEnum
CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED');

-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" TEXT NOT NULL,
    "internal_name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "html_content" TEXT NOT NULL,
    "editor_content_json" JSONB,
    "sender_name" TEXT,
    "from_email" TEXT,
    "reply_to" TEXT,
    "audience_type" "CommunicationAudienceType" NOT NULL DEFAULT 'MANUAL',
    "selected_course_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selected_bundle_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manually_selected_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excluded_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "send_status" "EmailRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "resend_message_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "email_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "internal_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rich_content" TEXT NOT NULL,
    "editor_content_json" JSONB,
    "image_url" TEXT,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "audience_type" "CommunicationAudienceType" NOT NULL DEFAULT 'MANUAL',
    "selected_course_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selected_bundle_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manually_selected_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excluded_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delivered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_campaign_recipients_campaign_id_email_key" ON "email_campaign_recipients"("campaign_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notification_id_user_id_key" ON "notification_recipients"("notification_id", "user_id");

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BundleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('DIRECT', 'BUNDLE');

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "source" "EnrollmentSource" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "source_bundle_id" TEXT;

-- CreateTable
CREATE TABLE "course_bundles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "launch_date" TIMESTAMP(3),
    "status" "BundleStatus" NOT NULL DEFAULT 'DRAFT',
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "access_duration_months" INTEGER,
    "is_permanent_access" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_courses" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_prices" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "discounted_price" DECIMAL(10,2),
    "discount_start_at" TIMESTAMP(3),
    "discount_end_at" TIMESTAMP(3),
    "max_discounted_enrollments" INTEGER,
    "discounted_enrollments_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bundle_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_bundles_slug_key" ON "course_bundles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_courses_bundle_id_course_id_key" ON "bundle_courses"("bundle_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_prices_bundle_id_currency_key" ON "bundle_prices"("bundle_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_enrollments_user_id_bundle_id_key" ON "bundle_enrollments"("user_id", "bundle_id");

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_source_bundle_id_fkey" FOREIGN KEY ("source_bundle_id") REFERENCES "course_bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_bundles" ADD CONSTRAINT "course_bundles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_courses" ADD CONSTRAINT "bundle_courses_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "course_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_courses" ADD CONSTRAINT "bundle_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_prices" ADD CONSTRAINT "bundle_prices_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "course_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_enrollments" ADD CONSTRAINT "bundle_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_enrollments" ADD CONSTRAINT "bundle_enrollments_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "course_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

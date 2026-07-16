-- CreateEnum
CREATE TYPE "CourseLearningStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "course_prices" ADD COLUMN     "discount_end_at" TIMESTAMP(3),
ADD COLUMN     "discount_start_at" TIMESTAMP(3),
ADD COLUMN     "discounted_enrollments_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discounted_price" DECIMAL(10,2),
ADD COLUMN     "max_discounted_enrollments" INTEGER;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "launch_date" TIMESTAMP(3),
ADD COLUMN     "learning_objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "learning_status" "CourseLearningStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "access_duration_months" INTEGER,
ADD COLUMN     "access_end_at" TIMESTAMP(3),
ADD COLUMN     "access_start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_permanent" BOOLEAN NOT NULL DEFAULT true;

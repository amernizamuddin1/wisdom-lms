-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GROUP_ADMIN';

-- AlterTable
ALTER TABLE "tenant_memberships" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "groups_tenant_id_idx" ON "groups"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_tenant_id_slug_key" ON "groups"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "group_memberships_tenant_id_user_id_idx" ON "group_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_memberships_group_id_user_id_key" ON "group_memberships"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


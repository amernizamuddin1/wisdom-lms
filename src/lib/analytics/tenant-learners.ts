import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import type { Prisma } from "@/generated/prisma/client";

// TenantMembership is intentionally excluded from the Prisma tenant-scoping
// extension (it's the identity table itself), so callers must derive
// tenantId from the ambient context explicitly. This is the single place
// that resolves "which users count as this tenant's learners" — every
// analytics query that used to read the global, unscoped User.role field
// should go through here instead, since a user can hold different roles in
// different tenants and User.role has no per-tenant meaning.

export async function getTenantStudentMemberships(): Promise<{ userId: string; createdAt: Date }[]> {
  const tenantId = await getTenantId();
  return prisma.tenantMembership.findMany({
    where: { tenantId, role: "STUDENT", status: "ACTIVE" },
    select: { userId: true, createdAt: true },
  });
}

export async function countTenantStudents(extraWhere?: Pick<Prisma.TenantMembershipWhereInput, "createdAt">): Promise<number> {
  const tenantId = await getTenantId();
  return prisma.tenantMembership.count({
    where: { tenantId, role: "STUDENT", status: "ACTIVE", ...extraWhere },
  });
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import type { Prisma, TenantMembership } from "@/generated/prisma/client";

// TenantMembership is intentionally excluded from the Prisma tenant-scoping
// extension (src/lib/tenant-scoping.ts) since it's the identity table
// itself, so a lookup/write keyed only by its raw `id` bypasses tenant
// scoping entirely and could read or mutate another tenant's membership row.
// Every current call site keys off the compound tenantId_userId unique
// instead (see src/lib/auth.ts), but any future by-id call site needs one of
// these helpers rather than calling prisma.tenantMembership.{update,delete}
// directly with a bare `{ where: { id } }`.

export class TenantMembershipNotFoundError extends Error {
  constructor(id: string) {
    super(`TenantMembership ${id} not found in the active tenant`);
    this.name = "TenantMembershipNotFoundError";
  }
}

export async function findTenantMembershipById(id: string): Promise<TenantMembership | null> {
  const tenantId = await getTenantId();
  return prisma.tenantMembership.findFirst({ where: { id, tenantId } });
}

export async function updateTenantMembershipById(
  id: string,
  data: Prisma.TenantMembershipUpdateInput,
): Promise<void> {
  const tenantId = await getTenantId();
  const result = await prisma.tenantMembership.updateMany({ where: { id, tenantId }, data });
  if (result.count === 0) throw new TenantMembershipNotFoundError(id);
}

export async function deleteTenantMembershipById(id: string): Promise<void> {
  const tenantId = await getTenantId();
  const result = await prisma.tenantMembership.deleteMany({ where: { id, tenantId } });
  if (result.count === 0) throw new TenantMembershipNotFoundError(id);
}

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

describe.skipIf(!hasStagingDb)("User / TenantMembership isolation", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let userA: string, userB: string, sharedUser: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();

    userA = (
      await platformPrisma.user.create({
        data: {
          name: "Member A",
          email: `member-a-${s}@test.local`,
          role: "STUDENT",
          tenantMemberships: { create: { tenantId: WISDOMQUANT_TENANT_ID, role: "STUDENT", status: "ACTIVE" } },
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: userA } }));

    userB = (
      await platformPrisma.user.create({
        data: {
          name: "Member B",
          email: `member-b-${s}@test.local`,
          role: "STUDENT",
          tenantMemberships: { create: { tenantId: DEMO_ACADEMY_TENANT_ID, role: "STUDENT", status: "ACTIVE" } },
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: userB } }));

    // A single global user with independent memberships (different roles) in both tenants.
    sharedUser = (
      await platformPrisma.user.create({
        data: {
          name: "Shared User",
          email: `shared-${s}@test.local`,
          role: "STUDENT",
          tenantMemberships: {
            create: [
              { tenantId: WISDOMQUANT_TENANT_ID, role: "STUDENT", status: "ACTIVE" },
              { tenantId: DEMO_ACADEMY_TENANT_ID, role: "ADMIN", status: "ACTIVE" },
            ],
          },
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: sharedUser } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("requireAdmin/requireUser's exact lookup pattern (tenantId_userId compound key) returns null for a user with no membership in that tenant", async () => {
    // Mirrors src/lib/auth.ts::getActiveMembership exactly. TenantMembership
    // is intentionally excluded from the auto-scoping extension (it's the
    // identity table itself), so isolation here depends on every caller
    // filtering by the compound key explicitly — this is that contract.
    const membership = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      const tenantId = DEMO_ACADEMY_TENANT_ID;
      return prisma.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId, userId: userA } } });
    });
    expect(membership).toBeNull();
  });

  it("A single global user has independent, correctly-roled membership rows in each tenant", async () => {
    const membershipInA = await platformPrisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: WISDOMQUANT_TENANT_ID, userId: sharedUser } },
    });
    const membershipInB = await platformPrisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: DEMO_ACADEMY_TENANT_ID, userId: sharedUser } },
    });
    expect(membershipInA?.role).toBe("STUDENT");
    expect(membershipInB?.role).toBe("ADMIN");
  });

  it("Scoping the shared user's membership lookup as Tenant A returns only the Tenant A role", async () => {
    const membership = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.tenantMembership.findFirst({ where: { userId: sharedUser } });
    });
    expect(membership?.tenantId).toBe(WISDOMQUANT_TENANT_ID);
    expect(membership?.role).toBe("STUDENT");
  });

  // FIXED GAP (was documented in docs/multi-tenancy.md's "Known
  // limitations"): TenantMembership is intentionally excluded from the
  // auto-scoping extension (it's the identity table itself), so a raw
  // `{ where: { id } }` write bypasses tenant scoping entirely. No app code
  // used that pattern, but a future by-id call site built carelessly would
  // have been exploitable. src/lib/tenant-membership.ts now provides
  // find/update/deleteTenantMembershipById helpers that always re-derive
  // tenantId from the ambient context and fold it into the query — these
  // tests exercise that safe pattern directly.
  describe("Tenant-scoped TenantMembership-by-id helpers (src/lib/tenant-membership.ts)", () => {
    it("updates a membership by id within the same tenant", async () => {
      const membership = await platformPrisma.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId: WISDOMQUANT_TENANT_ID, userId: userA } },
      });
      await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
        const { updateTenantMembershipById } = await import("@/lib/tenant-membership");
        await updateTenantMembershipById(membership.id, { role: "ADMIN" });
      });
      const updated = await platformPrisma.tenantMembership.findUniqueOrThrow({ where: { id: membership.id } });
      expect(updated.role).toBe("ADMIN");
      // Restore for cleanup/isolation from other tests in this file.
      await platformPrisma.tenantMembership.update({ where: { id: membership.id }, data: { role: "STUDENT" } });
    });

    it("deletes a membership by id within the same tenant", async () => {
      const s = uniqueSuffix();
      const disposableUser = (
        await platformPrisma.user.create({
          data: {
            name: "Disposable Member",
            email: `disposable-${s}@test.local`,
            role: "STUDENT",
            tenantMemberships: { create: { tenantId: WISDOMQUANT_TENANT_ID, role: "STUDENT", status: "ACTIVE" } },
          },
        })
      ).id;
      cleanup.track(() => platformPrisma.user.delete({ where: { id: disposableUser } }).catch(() => {}));
      const membership = await platformPrisma.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId: WISDOMQUANT_TENANT_ID, userId: disposableUser } },
      });

      await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
        const { deleteTenantMembershipById } = await import("@/lib/tenant-membership");
        await deleteTenantMembershipById(membership.id);
      });

      const gone = await platformPrisma.tenantMembership.findUnique({ where: { id: membership.id } });
      expect(gone).toBeNull();
    });

    it("rejects an update by id when scoped to a different tenant", async () => {
      const membership = await platformPrisma.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId: WISDOMQUANT_TENANT_ID, userId: userA } },
      });
      await expect(
        asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
          const { updateTenantMembershipById } = await import("@/lib/tenant-membership");
          return updateTenantMembershipById(membership.id, { role: "ADMIN" });
        }),
      ).rejects.toThrow("not found in the active tenant");

      // Confirm nothing actually changed on Tenant A's row.
      const unchanged = await platformPrisma.tenantMembership.findUniqueOrThrow({ where: { id: membership.id } });
      expect(unchanged.role).toBe("STUDENT");
    });

    it("rejects a delete by id when scoped to a different tenant", async () => {
      const membership = await platformPrisma.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId: WISDOMQUANT_TENANT_ID, userId: userA } },
      });
      await expect(
        asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
          const { deleteTenantMembershipById } = await import("@/lib/tenant-membership");
          return deleteTenantMembershipById(membership.id);
        }),
      ).rejects.toThrow("not found in the active tenant");

      // Confirm Tenant A's row still exists.
      const stillThere = await platformPrisma.tenantMembership.findUnique({ where: { id: membership.id } });
      expect(stillThere).not.toBeNull();
    });

    it("rejects find/update/delete by an unknown membership id", async () => {
      const unknownId = "00000000-0000-0000-0000-00000000dead";
      await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
        const { findTenantMembershipById, updateTenantMembershipById, deleteTenantMembershipById } = await import(
          "@/lib/tenant-membership"
        );
        expect(await findTenantMembershipById(unknownId)).toBeNull();
        await expect(updateTenantMembershipById(unknownId, { role: "ADMIN" })).rejects.toThrow("not found in the active tenant");
        await expect(deleteTenantMembershipById(unknownId)).rejects.toThrow("not found in the active tenant");
      });
    });

    it("finds the correct per-tenant membership by id for a user with memberships in multiple tenants", async () => {
      const membershipInA = await platformPrisma.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId: WISDOMQUANT_TENANT_ID, userId: sharedUser } },
      });
      const membershipInB = await platformPrisma.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId: DEMO_ACADEMY_TENANT_ID, userId: sharedUser } },
      });

      const foundFromA = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
        const { findTenantMembershipById } = await import("@/lib/tenant-membership");
        return findTenantMembershipById(membershipInA.id);
      });
      expect(foundFromA?.role).toBe("STUDENT");

      // Tenant A scope must not be able to find Tenant B's row for the same user, even by its real id.
      const crossTenantLookup = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
        const { findTenantMembershipById } = await import("@/lib/tenant-membership");
        return findTenantMembershipById(membershipInB.id);
      });
      expect(crossTenantLookup).toBeNull();
    });
  });
});

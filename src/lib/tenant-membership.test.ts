import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockUpdateMany = vi.fn();
const mockDeleteMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantMembership: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

const mockGetTenantId = vi.fn();
vi.mock("@/lib/tenant-context", () => ({
  getTenantId: () => mockGetTenantId(),
}));

const { findTenantMembershipById, updateTenantMembershipById, deleteTenantMembershipById, TenantMembershipNotFoundError } = await import(
  "@/lib/tenant-membership"
);

const TENANT_ID = "tenant-1";
const MEMBERSHIP_ID = "membership-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTenantId.mockResolvedValue(TENANT_ID);
});

describe("findTenantMembershipById", () => {
  it("scopes the lookup to the active tenant", async () => {
    mockFindFirst.mockResolvedValue({ id: MEMBERSHIP_ID, tenantId: TENANT_ID });
    await findTenantMembershipById(MEMBERSHIP_ID);
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: MEMBERSHIP_ID, tenantId: TENANT_ID } });
  });

  it("returns null when the DB filter finds nothing (e.g. row belongs to another tenant)", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(findTenantMembershipById(MEMBERSHIP_ID)).resolves.toBeNull();
  });
});

describe("updateTenantMembershipById", () => {
  it("scopes the update to the active tenant and succeeds when a row matched", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    await updateTenantMembershipById(MEMBERSHIP_ID, { role: "ADMIN" });
    expect(mockUpdateMany).toHaveBeenCalledWith({ where: { id: MEMBERSHIP_ID, tenantId: TENANT_ID }, data: { role: "ADMIN" } });
  });

  it("throws TenantMembershipNotFoundError when no row matched (unknown id or cross-tenant)", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    await expect(updateTenantMembershipById(MEMBERSHIP_ID, { role: "ADMIN" })).rejects.toThrow(TenantMembershipNotFoundError);
  });
});

describe("deleteTenantMembershipById", () => {
  it("scopes the delete to the active tenant and succeeds when a row matched", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    await deleteTenantMembershipById(MEMBERSHIP_ID);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: MEMBERSHIP_ID, tenantId: TENANT_ID } });
  });

  it("throws TenantMembershipNotFoundError when no row matched (unknown id or cross-tenant)", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    await expect(deleteTenantMembershipById(MEMBERSHIP_ID)).rejects.toThrow(TenantMembershipNotFoundError);
  });
});

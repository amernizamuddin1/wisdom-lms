import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockCount = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantMembership: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

const mockGetTenantId = vi.fn();
vi.mock("@/lib/tenant-context", () => ({
  getTenantId: () => mockGetTenantId(),
}));

const { getTenantStudentMemberships, countTenantStudents } = await import("@/lib/analytics/tenant-learners");

const TENANT_ID = "tenant-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTenantId.mockResolvedValue(TENANT_ID);
});

describe("getTenantStudentMemberships", () => {
  it("queries only ACTIVE STUDENT memberships scoped to the active tenant", async () => {
    mockFindMany.mockResolvedValue([{ userId: "u1", createdAt: new Date() }]);
    await getTenantStudentMemberships();
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, role: "STUDENT", status: "ACTIVE" },
      select: { userId: true, createdAt: true },
    });
  });
});

describe("countTenantStudents", () => {
  it("counts only ACTIVE STUDENT memberships scoped to the active tenant", async () => {
    mockCount.mockResolvedValue(3);
    const result = await countTenantStudents();
    expect(mockCount).toHaveBeenCalledWith({ where: { tenantId: TENANT_ID, role: "STUDENT", status: "ACTIVE" } });
    expect(result).toBe(3);
  });

  it("merges an extra createdAt filter into the same tenant-scoped where clause", async () => {
    mockCount.mockResolvedValue(1);
    const createdAt = { gte: new Date("2026-01-01"), lte: new Date("2026-02-01") };
    await countTenantStudents({ createdAt });
    expect(mockCount).toHaveBeenCalledWith({ where: { tenantId: TENANT_ID, role: "STUDENT", status: "ACTIVE", createdAt } });
  });
});

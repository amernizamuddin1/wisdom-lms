import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCsv } from "@/lib/csv";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockGetTenantId = vi.fn();
vi.mock("@/lib/tenant-context", () => ({
  getTenantId: () => mockGetTenantId(),
}));

const mockUserFindUnique = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();
const mockMembershipFindUnique = vi.fn();
const mockMembershipCreate = vi.fn();
const mockCourseFindMany = vi.fn();
const mockCourseBundleFindFirst = vi.fn();
const mockCourseFindFirstOrThrow = vi.fn();
const mockCourseBundleFindFirstOrThrow = vi.fn();
const mockImportJobCreate = vi.fn();
const mockTransaction = vi.fn();

const txClient = {
  tenantMembership: {
    findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
    create: (...args: unknown[]) => mockMembershipCreate(...args),
  },
  course: { findFirstOrThrow: (...args: unknown[]) => mockCourseFindFirstOrThrow(...args) },
  courseBundle: { findFirstOrThrow: (...args: unknown[]) => mockCourseBundleFindFirstOrThrow(...args) },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockUserFindUniqueOrThrow(...args),
    },
    tenantMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
    },
    course: { findMany: (...args: unknown[]) => mockCourseFindMany(...args) },
    courseBundle: { findFirst: (...args: unknown[]) => mockCourseBundleFindFirst(...args) },
    importJob: { create: (...args: unknown[]) => mockImportJobCreate(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockCreateUserAccount = vi.fn();
vi.mock("@/lib/user-provisioning", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/user-provisioning")>();
  return { ...actual, createUserAccount: (...args: unknown[]) => mockCreateUserAccount(...args) };
});

const mockGrantCourseAccess = vi.fn();
vi.mock("@/lib/entitlements", () => ({
  grantCourseAccess: (...args: unknown[]) => mockGrantCourseAccess(...args),
}));

const mockGrantBundleAccess = vi.fn();
vi.mock("@/lib/bundle-access", () => ({
  grantBundleAccess: (...args: unknown[]) => mockGrantBundleAccess(...args),
}));

const { confirmUserImport } = await import("./actions");

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const ADMIN = { id: "admin-1" };

const HEADER = [
  "full_name",
  "email",
  "phone",
  "role",
  "course_title",
  "bundle_slug",
  "access_duration",
  "access_end_date",
];

function csvFor(rows: string[][]): string {
  return buildCsv([HEADER, ...rows]);
}

function formDataFor(csvText: string): FormData {
  const fd = new FormData();
  fd.set("csvText", csvText);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN);
  mockGetTenantId.mockResolvedValue(TENANT_A);
  mockCourseFindMany.mockResolvedValue([]);
  mockCourseBundleFindFirst.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue(null);
  mockMembershipFindUnique.mockResolvedValue(null);
  mockImportJobCreate.mockResolvedValue({});
  mockTransaction.mockImplementation(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient));
});

describe("confirmUserImport", () => {
  it("creates a brand-new user and a TenantMembership for the importing tenant", async () => {
    mockCreateUserAccount.mockResolvedValue({ ok: true, userId: "new-user-1" });

    const csv = csvFor([["Jane Doe", "jane@example.com", "", "STUDENT", "", "", "", ""]]);
    const result = await confirmUserImport({}, formDataFor(csv));

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(mockCreateUserAccount).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@example.com", role: "STUDENT" }),
    );
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { tenantId: TENANT_A, userId: "new-user-1", role: "STUDENT" },
    });
  });

  it("attaches an existing global user to this tenant instead of creating a duplicate account", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing-1" });
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: "existing-1" });
    mockMembershipFindUnique.mockResolvedValue(null); // not yet a member of TENANT_A

    const csv = csvFor([["John Smith", "john@example.com", "", "ADMIN", "", "", "", ""]]);
    const result = await confirmUserImport({}, formDataFor(csv));

    expect(result.successCount).toBe(1);
    expect(mockCreateUserAccount).not.toHaveBeenCalled();
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { tenantId: TENANT_A, userId: "existing-1", role: "ADMIN" },
    });
  });

  it("skips a row whose user is already a member of this tenant, without creating a duplicate membership", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing-1" });
    mockMembershipFindUnique.mockResolvedValue({ id: "membership-1" }); // already a member

    const csv = csvFor([["John Smith", "john@example.com", "", "STUDENT", "", "", "", ""]]);
    const result = await confirmUserImport({}, formDataFor(csv));

    expect(result.successCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(mockCreateUserAccount).not.toHaveBeenCalled();
    expect(mockMembershipCreate).not.toHaveBeenCalled();
  });

  it("re-running the same import (duplicate) is idempotent: still skips, still no duplicate membership", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing-1" });
    mockMembershipFindUnique.mockResolvedValue({ id: "membership-1" });

    const csv = csvFor([["John Smith", "john@example.com", "", "STUDENT", "", "", "", ""]]);
    const first = await confirmUserImport({}, formDataFor(csv));
    const second = await confirmUserImport({}, formDataFor(csv));

    expect(first.skippedCount).toBe(1);
    expect(second.skippedCount).toBe(1);
    expect(mockMembershipCreate).not.toHaveBeenCalled();
  });

  it("reports row-level errors for invalid rows without touching the database", async () => {
    const csv = csvFor([
      ["", "bad-email", "", "STUDENT", "", "", "", ""],
      ["Missing Role", "role@example.com", "", "MANAGER", "", "", "", ""],
    ]);
    const result = await confirmUserImport({}, formDataFor(csv));

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(2);
    expect(result.failures?.[0]).toMatchObject({ row: 2 });
    expect(result.failures?.[0].reason).toMatch(/full_name is required/);
    expect(result.failures?.[1]).toMatchObject({ row: 3 });
    expect(result.failures?.[1].reason).toMatch(/role "MANAGER" must be ADMIN or STUDENT/);
    expect(mockCreateUserAccount).not.toHaveBeenCalled();
    expect(mockMembershipCreate).not.toHaveBeenCalled();
  });

  it("keeps a global user's membership isolated per tenant — one tenant's import never attaches to another", async () => {
    mockUserFindUnique.mockImplementation(async () => ({ id: "shared-user-1" }));
    mockUserFindUniqueOrThrow.mockImplementation(async () => ({ id: "shared-user-1" }));
    // This user already has a membership in TENANT_A, but not TENANT_B.
    mockMembershipFindUnique.mockImplementation(
      async ({ where }: { where: { tenantId_userId: { tenantId: string } } }) =>
        where.tenantId_userId.tenantId === TENANT_A ? { id: "membership-in-a" } : null,
    );

    const csv = csvFor([["Shared User", "shared@example.com", "", "STUDENT", "", "", "", ""]]);

    mockGetTenantId.mockResolvedValue(TENANT_A);
    const resultA = await confirmUserImport({}, formDataFor(csv));
    expect(resultA.skippedCount).toBe(1); // already a member of A
    expect(mockMembershipCreate).not.toHaveBeenCalled();

    mockGetTenantId.mockResolvedValue(TENANT_B);
    const resultB = await confirmUserImport({}, formDataFor(csv));
    expect(resultB.successCount).toBe(1); // not yet a member of B — gets attached
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { tenantId: TENANT_B, userId: "shared-user-1", role: "STUDENT" },
    });
  });

  it("processes remaining rows when one row fails mid-import (partial failure)", async () => {
    mockCreateUserAccount.mockImplementation(async ({ email }: { email: string }) => ({
      ok: true,
      userId: email === "ok@example.com" ? "user-ok" : "user-fail",
    }));
    mockCourseFindMany.mockResolvedValue([{ id: "course-1" }]);
    mockCourseFindFirstOrThrow.mockResolvedValue({ id: "course-1" });
    mockGrantCourseAccess.mockImplementation(async (_tx: unknown, { userId }: { userId: string }) => {
      if (userId === "user-fail") throw new Error("access grant failed");
      return "enrollment-1";
    });

    const csv = csvFor([
      ["Ok User", "ok@example.com", "", "STUDENT", "Existing Course", "", "forever", ""],
      ["Fail User", "fail@example.com", "", "STUDENT", "Existing Course", "", "forever", ""],
    ]);
    const result = await confirmUserImport({}, formDataFor(csv));

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.failures?.[0]).toEqual({ row: 3, reason: "access grant failed" });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCsv } from "@/lib/csv";

const mockRequireGroupAccess = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireGroupAccess: (...args: unknown[]) => mockRequireGroupAccess(...args),
}));

const mockGetTenantId = vi.fn();
vi.mock("@/lib/tenant-context", () => ({
  getTenantId: () => mockGetTenantId(),
}));

const mockUserFindUnique = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();
const mockGroupMembershipFindUnique = vi.fn();
const mockGroupMembershipCreate = vi.fn();
const mockTenantMembershipFindUnique = vi.fn();
const mockTenantMembershipCreate = vi.fn();
const mockCourseFindMany = vi.fn();
const mockCourseFindFirstOrThrow = vi.fn();
const mockImportJobCreate = vi.fn();
const mockTransaction = vi.fn();

const txClient = {
  tenantMembership: {
    findUnique: (...args: unknown[]) => mockTenantMembershipFindUnique(...args),
    create: (...args: unknown[]) => mockTenantMembershipCreate(...args),
  },
  groupMembership: {
    findUnique: (...args: unknown[]) => mockGroupMembershipFindUnique(...args),
    create: (...args: unknown[]) => mockGroupMembershipCreate(...args),
  },
  course: { findFirstOrThrow: (...args: unknown[]) => mockCourseFindFirstOrThrow(...args) },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockUserFindUniqueOrThrow(...args),
    },
    groupMembership: { findUnique: (...args: unknown[]) => mockGroupMembershipFindUnique(...args) },
    course: { findMany: (...args: unknown[]) => mockCourseFindMany(...args) },
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

const { confirmGroupImport } = await import("./actions");

const TENANT_A = "tenant-a";
const GROUP_A = "group-a";
const ADMIN = { id: "admin-1" };

const HEADER = [
  "full_name",
  "email",
  "phone",
  "course_title",
  "register_date",
  "course_progress",
  "lesson",
  "quiz",
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
  mockRequireGroupAccess.mockResolvedValue(ADMIN);
  mockGetTenantId.mockResolvedValue(TENANT_A);
  mockCourseFindMany.mockResolvedValue([{ id: "course-1" }]);
  mockCourseFindFirstOrThrow.mockResolvedValue({ id: "course-1" });
  mockUserFindUnique.mockResolvedValue(null);
  mockUserFindUniqueOrThrow.mockResolvedValue({ id: "new-user-1" });
  mockGroupMembershipFindUnique.mockResolvedValue(null);
  mockTenantMembershipFindUnique.mockResolvedValue(null);
  mockImportJobCreate.mockResolvedValue({});
  mockCreateUserAccount.mockResolvedValue({ ok: true, userId: "new-user-1" });
  mockGrantCourseAccess.mockResolvedValue("enrollment-1");
  mockTransaction.mockImplementation(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient));
});

describe("confirmGroupImport — legacy progress columns", () => {
  it("passes the parsed register_date and legacy snapshot through to grantCourseAccess", async () => {
    const csv = csvFor([
      ["Jane Doe", "jane@example.com", "", "Naan Mudhalvan", "01 Jan 2026", "40%", "4/10", "1/2"],
    ]);
    const result = await confirmGroupImport(GROUP_A, {}, formDataFor(csv));

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(mockGrantCourseAccess).toHaveBeenCalledWith(
      txClient,
      expect.objectContaining({
        enrolledAt: new Date("01 Jan 2026"),
        legacy: {
          progressPercent: 40,
          lessonsCompleted: 4,
          lessonsTotal: 10,
          quizzesCompleted: 1,
          quizzesTotal: 2,
        },
      }),
    );
  });

  it("omits the legacy snapshot for a row with a course but no legacy columns", async () => {
    const csv = csvFor([["Jane Doe", "jane@example.com", "", "Naan Mudhalvan", "", "", "", ""]]);
    const result = await confirmGroupImport(GROUP_A, {}, formDataFor(csv));

    expect(result.successCount).toBe(1);
    expect(mockGrantCourseAccess).toHaveBeenCalledWith(
      txClient,
      expect.objectContaining({ enrolledAt: undefined, legacy: undefined }),
    );
  });

  it.each([
    [["Jane Doe", "jane@example.com", "", "Naan Mudhalvan", "not-a-date", "40%", "4/10", "1/2"], /register_date/],
    [["Jane Doe", "jane@example.com", "", "Naan Mudhalvan", "01 Jan 2026", "140%", "4/10", "1/2"], /course_progress/],
    [["Jane Doe", "jane@example.com", "", "Naan Mudhalvan", "01 Jan 2026", "40%", "11/10", "1/2"], /lesson/],
    [["Jane Doe", "jane@example.com", "", "Naan Mudhalvan", "01 Jan 2026", "40%", "4/10", "3/2"], /quiz/],
    [["Jane Doe", "jane@example.com", "", "", "01 Jan 2026", "40%", "4/10", "1/2"], /course_title/],
  ])("rejects an invalid legacy row: %s", async (row, expectedError) => {
    const csv = csvFor([row]);
    const result = await confirmGroupImport(GROUP_A, {}, formDataFor(csv));

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.failures?.[0].reason).toMatch(expectedError);
    expect(mockGrantCourseAccess).not.toHaveBeenCalled();
  });
});

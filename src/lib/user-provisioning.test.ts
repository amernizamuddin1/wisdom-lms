import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: mockCreateUser, deleteUser: mockDeleteUser } },
  }),
}));

const mockUserCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockMembershipFindUnique = vi.fn();
const mockMembershipCreate = vi.fn();
const mockTransaction = vi.fn();

const txClient = {
  user: { create: (...args: unknown[]) => mockUserCreate(...args) },
  tenantMembership: {
    findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
    create: (...args: unknown[]) => mockMembershipCreate(...args),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    tenantMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
      create: (...args: unknown[]) => mockMembershipCreate(...args),
    },
  },
}));

const mockGetTenantId = vi.fn();
vi.mock("@/lib/tenant-context", () => ({
  getTenantId: () => mockGetTenantId(),
}));

const mockRecordUserRegistered = vi.fn();
vi.mock("@/lib/gamification/events", () => ({
  recordUserRegistered: (...args: unknown[]) => mockRecordUserRegistered(...args),
}));

const { createUserAccount, findOrCreateUser, ensureTenantMembership } = await import(
  "@/lib/user-provisioning"
);

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTenantId.mockResolvedValue(TENANT_A);
  // Default: transactions just run the callback against the shared tx mock.
  mockTransaction.mockImplementation(async (fnOrArray: unknown) => {
    if (typeof fnOrArray === "function") return fnOrArray(txClient);
    return undefined;
  });
});

describe("ensureTenantMembership", () => {
  it("creates a membership when none exists for this tenant", async () => {
    mockMembershipFindUnique.mockResolvedValue(null);
    const result = await ensureTenantMembership(txClient as never, {
      tenantId: TENANT_A,
      userId: "user-1",
      role: "STUDENT",
    });
    expect(result).toEqual({ created: true });
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { tenantId: TENANT_A, userId: "user-1", role: "STUDENT" },
    });
  });

  it("is a no-op when a membership already exists (no duplicate created)", async () => {
    mockMembershipFindUnique.mockResolvedValue({ id: "membership-1" });
    const result = await ensureTenantMembership(txClient as never, {
      tenantId: TENANT_A,
      userId: "user-1",
      role: "ADMIN",
    });
    expect(result).toEqual({ created: false });
    expect(mockMembershipCreate).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the given tenantId, not any tenant the user belongs to", async () => {
    mockMembershipFindUnique.mockResolvedValue(null);
    await ensureTenantMembership(txClient as never, {
      tenantId: TENANT_B,
      userId: "user-1",
      role: "STUDENT",
    });
    expect(mockMembershipFindUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: TENANT_B, userId: "user-1" } },
      select: { id: true },
    });
  });
});

describe("createUserAccount", () => {
  it("creates the Supabase auth user, the Prisma profile, and a TenantMembership in the caller's tenant", async () => {
    mockCreateUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    mockMembershipFindUnique.mockResolvedValue(null);

    const result = await createUserAccount({
      email: "a@example.com",
      name: "Ada",
      password: "pw",
      role: "ADMIN",
    });

    expect(result).toEqual({ ok: true, userId: "new-user-1" });
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: { id: "new-user-1", name: "Ada", email: "a@example.com", phone: null, role: "ADMIN" },
    });
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { tenantId: TENANT_A, userId: "new-user-1", role: "ADMIN" },
    });
    expect(mockRecordUserRegistered).toHaveBeenCalledWith(txClient, "new-user-1");
  });

  it("defaults role to STUDENT for both the profile and the membership", async () => {
    mockCreateUser.mockResolvedValue({ data: { user: { id: "new-user-2" } }, error: null });
    mockMembershipFindUnique.mockResolvedValue(null);

    await createUserAccount({ email: "b@example.com", name: "Bo", password: "pw" });

    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "STUDENT" }) }),
    );
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { tenantId: TENANT_A, userId: "new-user-2", role: "STUDENT" },
    });
  });

  it("rolls back the orphaned Supabase auth user and creates no membership if the Prisma write fails", async () => {
    mockCreateUser.mockResolvedValue({ data: { user: { id: "new-user-3" } }, error: null });
    mockUserCreate.mockRejectedValue(new Error("unique constraint"));
    mockDeleteUser.mockResolvedValue({});

    const result = await createUserAccount({ email: "dup@example.com", name: "Dup", password: "pw" });

    expect(result).toEqual({ ok: false, error: "An account with this email already exists." });
    expect(mockDeleteUser).toHaveBeenCalledWith("new-user-3");
    expect(mockMembershipCreate).not.toHaveBeenCalled();
  });
});

describe("findOrCreateUser", () => {
  it("attaches an already-existing global user to the current tenant instead of creating a new account", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing-user-1" });
    mockMembershipFindUnique.mockResolvedValue(null);

    const result = await findOrCreateUser("existing@example.com", "Existing", null);

    expect(result).toEqual({ ok: true, userId: "existing-user-1" });
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { tenantId: TENANT_A, userId: "existing-user-1", role: "STUDENT" },
    });
  });
});

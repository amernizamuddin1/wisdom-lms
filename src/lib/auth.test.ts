import { describe, it, expect, vi, beforeEach } from "vitest";

// next/navigation's redirect() always throws internally (NEXT_REDIRECT) —
// mimic that so call sites that don't catch it correctly still surface as a
// clear thrown error in tests, instead of silently falling through.
class RedirectError extends Error {
  constructor(public to: string) {
    super(`REDIRECT:${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

const mockUserFindUnique = vi.fn();
const mockMembershipFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    tenantMembership: { findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args) },
  },
}));

const mockGetTenantId = vi.fn();
vi.mock("@/lib/tenant-context", () => ({
  getTenantId: () => mockGetTenantId(),
}));

const { requireAdmin, requireUser, getOptionalUser, resolvePostLoginPath } = await import("@/lib/auth");

const TENANT_ID = "tenant-1";
const PROFILE = { id: "user-1", name: "Ada", email: "ada@example.com" };

const WISDOMQUANT_TENANT_ID = "tenant-wisdomquant";
const DEMO_ACADEMY_TENANT_ID = "tenant-demo-academy";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTenantId.mockResolvedValue(TENANT_ID);
});

describe("requireAdmin", () => {
  it("redirects to /admin/login when there is no Supabase session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("redirects to /dashboard when the user has no membership in the active tenant", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects to /dashboard when the membership role is STUDENT, not ADMIN", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue({ role: "STUDENT", status: "ACTIVE" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects to /dashboard when the ADMIN membership has been removed", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue({ role: "ADMIN", status: "REMOVED" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("returns the profile when the user has an ACTIVE ADMIN membership in the active tenant", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue({ role: "ADMIN", status: "ACTIVE" });
    await expect(requireAdmin()).resolves.toEqual(PROFILE);
    expect(mockMembershipFindUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: TENANT_ID, userId: PROFILE.id } },
    });
  });

  it("lets the same user be a STUDENT in one tenant and ADMIN in another", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);

    mockGetTenantId.mockResolvedValueOnce("tenant-student-only");
    mockMembershipFindUnique.mockResolvedValueOnce({ role: "STUDENT", status: "ACTIVE" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard");

    mockGetTenantId.mockResolvedValueOnce("tenant-admin-here");
    mockMembershipFindUnique.mockResolvedValueOnce({ role: "ADMIN", status: "ACTIVE" });
    await expect(requireAdmin()).resolves.toEqual(PROFILE);
  });
});

describe("requireUser", () => {
  it("redirects to /login when there is no Supabase session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when the user has no membership in the active tenant", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns the profile for any ACTIVE membership regardless of role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue({ role: "STUDENT", status: "ACTIVE" });
    await expect(requireUser()).resolves.toEqual(PROFILE);
  });
});

describe("getOptionalUser", () => {
  it("returns null when there is no Supabase session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(getOptionalUser()).resolves.toBeNull();
  });

  it("returns null when the user has no active membership in this tenant", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue(null);
    await expect(getOptionalUser()).resolves.toBeNull();
  });

  it("returns the profile when there is an active membership", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue({ role: "STUDENT", status: "ACTIVE" });
    await expect(getOptionalUser()).resolves.toEqual(PROFILE);
  });
});

describe("resolvePostLoginPath", () => {
  it("sends a WisdomQuant ADMIN membership to /admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockGetTenantId.mockResolvedValue(WISDOMQUANT_TENANT_ID);
    mockMembershipFindUnique.mockResolvedValue({ role: "ADMIN", status: "ACTIVE" });
    await expect(resolvePostLoginPath()).resolves.toBe("/admin");
  });

  it("sends a WisdomQuant STUDENT membership to /dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockGetTenantId.mockResolvedValue(WISDOMQUANT_TENANT_ID);
    mockMembershipFindUnique.mockResolvedValue({ role: "STUDENT", status: "ACTIVE" });
    await expect(resolvePostLoginPath()).resolves.toBe("/dashboard");
  });

  it("sends a Demo Academy ADMIN membership to /admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockGetTenantId.mockResolvedValue(DEMO_ACADEMY_TENANT_ID);
    mockMembershipFindUnique.mockResolvedValue({ role: "ADMIN", status: "ACTIVE" });
    await expect(resolvePostLoginPath()).resolves.toBe("/admin");
  });

  it("sends a Demo Academy STUDENT membership to /dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockGetTenantId.mockResolvedValue(DEMO_ACADEMY_TENANT_ID);
    mockMembershipFindUnique.mockResolvedValue({ role: "STUDENT", status: "ACTIVE" });
    await expect(resolvePostLoginPath()).resolves.toBe("/dashboard");
  });

  it("resolves a cross-tenant shared user by the active tenant's membership, not any other tenant's", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);

    // Same user is STUDENT on WisdomQuant but ADMIN on Demo Academy — the
    // active tenant (set by proxy.ts from the request host) must be the only
    // thing that decides the destination.
    mockGetTenantId.mockResolvedValueOnce(WISDOMQUANT_TENANT_ID);
    mockMembershipFindUnique.mockResolvedValueOnce({ role: "STUDENT", status: "ACTIVE" });
    await expect(resolvePostLoginPath()).resolves.toBe("/dashboard");

    mockGetTenantId.mockResolvedValueOnce(DEMO_ACADEMY_TENANT_ID);
    mockMembershipFindUnique.mockResolvedValueOnce({ role: "ADMIN", status: "ACTIVE" });
    await expect(resolvePostLoginPath()).resolves.toBe("/admin");
  });

  it("sends unauthenticated callers to /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(resolvePostLoginPath()).resolves.toBe("/login");
  });

  it("sends a removed membership to /login rather than either dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: PROFILE.id } } });
    mockUserFindUnique.mockResolvedValue(PROFILE);
    mockMembershipFindUnique.mockResolvedValue({ role: "ADMIN", status: "REMOVED" });
    await expect(resolvePostLoginPath()).resolves.toBe("/login");
  });
});

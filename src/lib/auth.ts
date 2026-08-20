import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import type { User } from "@/generated/prisma/client";

const getAuthenticatedUser = cache(async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

const getProfile = cache(async function getProfile(userId: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id: userId } });
});

// Looks up the caller's membership in the active tenant (resolved by
// proxy.ts). A user can belong to several tenants with different roles, so
// the tenant-scoped membership — not the legacy global User.role — is now
// the source of truth for "is this person an admin here". User.role is left
// in place as a deprecated fallback field only (not read by these helpers).
//
// Wrapped in React's `cache()` because layouts and pages in the same request
// routinely both need the caller's membership (e.g. dashboard layout + page
// each resolving the current user) — this dedupes the Supabase Auth call and
// the two Prisma lookups to once per request instead of once per caller.
const getActiveMembership = cache(async function getActiveMembership(userId: string) {
  const tenantId = await getTenantId();
  return prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
});

// Called right after a successful Supabase sign-in to decide where to send
// the browser. Resolves purely from TenantMembership.role in the active
// tenant (never from email) so the same login form works for every role and
// every tenant, and a cross-tenant user lands on the right destination for
// whichever tenant they signed in on.
//
// `loginPath` lets both the student (`/login`) and admin (`/admin/login`)
// forms share this logic. Authentication succeeding with no membership in
// the *active* tenant (e.g. a Demo Academy admin signing in on WisdomQuant's
// host) is a distinct case from "not signed in at all" — it gets routed back
// to the same login form with `?error=no_access` so the page can explain
// why, instead of silently landing back on a blank login form.
export async function resolvePostLoginPath(loginPath: string = "/login"): Promise<string> {
  const user = await getAuthenticatedUser();

  if (!user) return loginPath;

  const profile = await getProfile(user.id);
  if (!profile) return loginPath;

  const membership = await getActiveMembership(profile.id);
  if (!membership || membership.status !== "ACTIVE") return `${loginPath}?error=no_access`;

  if (membership.role === "ADMIN") return "/admin";
  if (membership.role === "GROUP_ADMIN" && membership.groupId) {
    return `/admin/groups/${membership.groupId}`;
  }
  return "/dashboard";
}

// Each of these is called from both a layout and a page (or several actions)
// within the same request in normal usage — cache() dedupes the Supabase Auth
// call and the two Prisma lookups to once per request instead of once per caller.
export const requireAdmin = cache(async function requireAdmin(): Promise<User> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login");
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/admin/login");
  }

  const membership = await getActiveMembership(profile.id);

  // A signed-in non-admin hitting /admin/login would otherwise get bounced right
  // back to /admin by proxy.ts (it redirects any signed-in session away from the
  // login page) — an infinite loop. Send them to their own dashboard instead.
  if (!membership || membership.status !== "ACTIVE" || membership.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return profile;
});

export type GroupScope = { role: "ADMIN" } | { role: "GROUP_ADMIN"; groupId: string };

// Resolves what group(s), if any, the caller's admin access is scoped to in
// the active tenant. An ADMIN is unrestricted; a GROUP_ADMIN is scoped to the
// single group on their TenantMembership.groupId. Returns null for anyone
// else (STUDENT, no membership, inactive membership).
export const getGroupScope = cache(async function getGroupScope(
  userId: string,
): Promise<GroupScope | null> {
  const membership = await getActiveMembership(userId);
  if (!membership || membership.status !== "ACTIVE") return null;
  if (membership.role === "ADMIN") return { role: "ADMIN" };
  if (membership.role === "GROUP_ADMIN" && membership.groupId) {
    return { role: "GROUP_ADMIN", groupId: membership.groupId };
  }
  return null;
});

// Gate for the new group-scoped admin routes (src/app/admin/(dashboard)/groups/**).
// Admits a tenant ADMIN (any group) or a GROUP_ADMIN whose own groupId matches
// the requested one; redirects everyone else. Existing ADMIN-only routes are
// unaffected — they keep calling requireAdmin(), which still rejects GROUP_ADMIN.
export async function requireGroupAccess(groupId: string): Promise<User> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login");
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/admin/login");
  }

  const scope = await getGroupScope(profile.id);

  if (!scope || (scope.role === "GROUP_ADMIN" && scope.groupId !== groupId)) {
    redirect("/dashboard");
  }

  return profile;
}

// Gate for the shared admin dashboard shell (src/app/admin/(dashboard)/layout.tsx),
// which both a tenant ADMIN and a GROUP_ADMIN can enter — individual ADMIN-only
// pages/actions within it still call requireAdmin() themselves and reject
// GROUP_ADMIN, so this only widens the outer shell, not what's reachable inside it.
export const requireAdminOrGroupAdmin = cache(async function requireAdminOrGroupAdmin(): Promise<{
  profile: User;
  scope: GroupScope;
}> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login");
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/admin/login");
  }

  const scope = await getGroupScope(profile.id);

  if (!scope) {
    redirect("/dashboard");
  }

  return { profile, scope };
});

export const requireUser = cache(async function requireUser(): Promise<User> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/login");
  }

  const membership = await getActiveMembership(profile.id);

  if (!membership || membership.status !== "ACTIVE") {
    redirect("/login");
  }

  return profile;
});

// Non-redirecting lookup for public pages that render differently for signed-in
// vs. anonymous visitors (e.g. Enroll vs. Go to Course) instead of gating access.
export const getOptionalUser = cache(async function getOptionalUser(): Promise<User | null> {
  const user = await getAuthenticatedUser();

  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const membership = await getActiveMembership(profile.id);
  if (!membership || membership.status !== "ACTIVE") return null;

  return profile;
});

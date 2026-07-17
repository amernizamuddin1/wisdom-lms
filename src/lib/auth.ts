import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";
import type { User } from "@/generated/prisma/client";

// Looks up the caller's membership in the active tenant (resolved by
// proxy.ts). A user can belong to several tenants with different roles, so
// the tenant-scoped membership — not the legacy global User.role — is now
// the source of truth for "is this person an admin here". User.role is left
// in place as a deprecated fallback field only (not read by these helpers).
async function getActiveMembership(userId: string) {
  const tenantId = await getTenantId();
  return prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
}

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return loginPath;

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile) return loginPath;

  const membership = await getActiveMembership(profile.id);
  if (!membership || membership.status !== "ACTIVE") return `${loginPath}?error=no_access`;

  return membership.role === "ADMIN" ? "/admin" : "/dashboard";
}

export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const profile = await prisma.user.findUnique({ where: { id: user.id } });

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
}

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.user.findUnique({ where: { id: user.id } });

  if (!profile) {
    redirect("/login");
  }

  const membership = await getActiveMembership(profile.id);

  if (!membership || membership.status !== "ACTIVE") {
    redirect("/login");
  }

  return profile;
}

// Non-redirecting lookup for public pages that render differently for signed-in
// vs. anonymous visitors (e.g. Enroll vs. Go to Course) instead of gating access.
export async function getOptionalUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile) return null;

  const membership = await getActiveMembership(profile.id);
  if (!membership || membership.status !== "ACTIVE") return null;

  return profile;
}

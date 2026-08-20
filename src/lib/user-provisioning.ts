import "server-only";
import { prisma, type PrismaTransaction } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { Role } from "@/generated/prisma/client";
import { recordUserRegistered } from "@/lib/gamification/events";
import { getTenantId } from "@/lib/tenant-context";

export type ProvisionResult =
  | { ok: true; userId: string; signInError?: true }
  | { ok: false; error: string };

export type CreateAccountResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

// Idempotent: a second call for the same (tenantId, userId) pair is a no-op,
// so callers (bulk import re-runs, findOrCreateUser on a repeat purchase) never
// need to check first or risk the @@unique([tenantId, userId]) constraint.
// Never derive tenantId from anything but the caller's own authenticated
// tenant context (getTenantId()) — this is the only thing standing between a
// tenant and attaching arbitrary global users to itself.
export async function ensureTenantMembership(
  tx: PrismaTransaction,
  params: { tenantId: string; userId: string; role: Role },
): Promise<{ created: boolean }> {
  const existing = await tx.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: params.tenantId, userId: params.userId } },
    select: { id: true },
  });
  if (existing) return { created: false };
  await tx.tenantMembership.create({
    data: { tenantId: params.tenantId, userId: params.userId, role: params.role },
  });
  return { created: true };
}

// Idempotent, mirroring ensureTenantMembership above — a second call for the
// same (groupId, userId) pair is a no-op. Unlike TenantMembership (one row per
// user per tenant), a user can belong to several groups, so this is a plain
// upsert-style check against the @@unique([groupId, userId]) constraint
// rather than a single-slot assignment.
export async function ensureGroupMembership(
  tx: PrismaTransaction,
  params: { tenantId: string; groupId: string; userId: string },
): Promise<{ created: boolean }> {
  const existing = await tx.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.groupId, userId: params.userId } },
    select: { id: true },
  });
  if (existing) return { created: false };
  await tx.groupMembership.create({
    data: { tenantId: params.tenantId, groupId: params.groupId, userId: params.userId },
  });
  return { created: true };
}

// Creates a new Supabase Auth + Prisma User account (no sign-in). Shared by
// findOrCreateUser (below, random password) and any flow that already has a
// password of its own to set — self-serve registration, CSV bulk user import.
// email_confirm is always true: this app has no email-verification flow anywhere,
// new accounts are usable immediately.
export async function createUserAccount(params: {
  email: string;
  name: string;
  password: string;
  role?: Role;
  phone?: string | null;
}): Promise<CreateAccountResult> {
  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return { ok: false, error: "Couldn't create the account. Please try again." };
  }

  const role = params.role ?? "STUDENT";
  try {
    const tenantId = await getTenantId();
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: created.user.id,
          name: params.name,
          email: params.email,
          phone: params.phone ?? null,
          role,
        },
      });
      // Every account created through this function is created *by* some tenant
      // (self-registration on its subdomain, a purchase on it, an admin's CSV
      // import) — it must come out the other end able to sign in there.
      await ensureTenantMembership(tx, { tenantId, userId: created.user.id, role });
    });
  } catch {
    // Roll back the orphaned auth user rather than leaving a Supabase account with
    // no matching profile row (would otherwise be unreachable through the app).
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { ok: false, error: "An account with this email already exists." };
  }

  await prisma.$transaction((tx) => recordUserRegistered(tx, created.user.id));

  return { ok: true, userId: created.user.id };
}

// Resolves a userId for a name+email pair: reuses an existing account, or creates a
// new Supabase + Prisma user. `sessionClient` must be the request-scoped, cookie-aware
// client from src/lib/supabase/server.ts so a newly created user's sign-in cookie
// actually lands on the current response — pass null when there's no browser session
// to attach to (e.g. a payment webhook), which simply skips the sign-in step.
export async function findOrCreateUser(
  email: string,
  name: string,
  sessionClient: Awaited<ReturnType<typeof createClient>> | null,
): Promise<ProvisionResult> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const tenantId = await getTenantId();
    await ensureTenantMembership(prisma, { tenantId, userId: existing.id, role: "STUDENT" });
    return { ok: true, userId: existing.id };
  }

  const password = crypto.randomUUID();
  const result = await createUserAccount({ email, name, password });
  if (!result.ok) {
    return { ok: false, error: "An account with this email already exists. Please log in to enroll." };
  }

  if (sessionClient) {
    const { error: signInErr } = await sessionClient.auth.signInWithPassword({ email, password });
    if (signInErr) {
      // Account was created successfully — sign-in failure is reported back so the
      // caller can surface it, but provisioning itself still succeeded.
      return { ok: true, userId: result.userId, signInError: true };
    }
  }

  return { ok: true, userId: result.userId };
}

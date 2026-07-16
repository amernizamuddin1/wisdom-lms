import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getTenantId } from "@/lib/tenant-context";
import { applyTenantScope, TENANT_SCOPED_MODELS, type ScopableArgs } from "@/lib/tenant-scoping";

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prisma?: ReturnType<typeof createScopedClient>;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const base = globalForPrisma.prismaBase ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
}

function createScopedClient() {
  return base.$extends({
    name: "tenantScoping",
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model?: string;
          operation: string;
          args: ScopableArgs;
          query: (args: ScopableArgs) => Promise<unknown>;
        }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }
          const tenantId = await getTenantId();
          return query(applyTenantScope(model, operation, args, tenantId));
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createScopedClient();

// Type for "a prisma client or an active interactive transaction" — matches
// what `prisma.$transaction(async (tx) => ...)` actually infers for `tx`
// (the extended client minus $connect/$disconnect/$on/$use/$extends, mirroring
// Prisma's own ITXClientDenyList). Helper functions that accept either the
// ambient `prisma` import or a `tx` (previously typed `Prisma.TransactionClient`,
// which only matches the *unextended* base client and doesn't structurally
// match our tenant-scoped extension) should use this instead.
export type PrismaTransaction = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

// Unscoped escape hatch for genuinely cross-tenant operations: the platform
// super-admin console (tenant CRUD, assigning tenant admins) and the tenant
// resolver itself (which must look up Tenant rows before any tenant is known).
// Never import this into ordinary admin/dashboard/public code paths.
export const platformPrisma = base;

// Wraps a block of work in an explicit tenant scope for code that has no
// request headers to resolve a tenant from (Razorpay webhooks, cron jobs).
// This only sets the AsyncLocalStorage override the extension above reads
// from — it does NOT yet issue a `SET LOCAL app.tenant_id` on the underlying
// connection, since doing that correctly requires every query inside `fn`
// to run on the same transaction-bound client this function opens, which
// isn't wired through the global `prisma` export today. That connection
// threading + the actual `SET LOCAL`/RLS policies are added together in the
// follow-up RLS stage (see docs/multi-tenancy.md) once the app also connects
// as the non-bypass DB role — enabling one without the other would just be
// silently inert and give false confidence.
export async function runWithTenant<T>(
  tenantId: string,
  tenantSlug: string,
  fn: () => Promise<T>,
): Promise<T> {
  const { runWithTenantContext } = await import("@/lib/tenant-context");
  return runWithTenantContext({ tenantId, tenantSlug }, fn);
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { headers } from "next/headers";

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
}

// Two ways a request ends up with a resolved tenant:
//
// 1. Normal HTTP path (pages, layouts, server actions, route handlers): every
//    one of these is its own request that passes through proxy.ts, which
//    resolves the tenant from the host and stamps it onto x-tenant-id/
//    x-tenant-slug request headers. next/headers' headers() is itself
//    request-scoped by Next.js, so reading it back out here is correctly
//    isolated per request/action invocation with zero boilerplate at ~130
//    existing call sites.
// 2. Out-of-band path (Razorpay webhooks, cron jobs): there is no tenant
//    subdomain on the incoming request, so the tenant is resolved from the
//    payload itself (e.g. Razorpay order notes) and explicitly scoped around
//    a block of code via runWithTenantContext/AsyncLocalStorage. This override
//    always takes priority over headers when present.
const overrideStorage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return overrideStorage.run(context, fn);
}

// Throws instead of silently falling back to "no tenant" — a query that runs
// outside a resolved request (e.g. a script that forgot to set context) must
// fail loudly rather than risk leaking cross-tenant data.
export const getTenantContext = cache(async function getTenantContext(): Promise<TenantContext> {
  const override = overrideStorage.getStore();
  if (override) return override;

  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantId || !tenantSlug) {
    throw new Error(
      "No tenant context available. Every server entrypoint must either run " +
        "behind proxy.ts (which stamps x-tenant-id/x-tenant-slug headers) or " +
        "explicitly wrap the call in runWithTenantContext() (webhooks/cron).",
    );
  }
  return { tenantId, tenantSlug };
});

export const getOptionalTenantContext = cache(async function getOptionalTenantContext(): Promise<TenantContext | null> {
  const override = overrideStorage.getStore();
  if (override) return override;

  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantId || !tenantSlug) return null;
  return { tenantId, tenantSlug };
});

export async function getTenantId(): Promise<string> {
  return (await getTenantContext()).tenantId;
}

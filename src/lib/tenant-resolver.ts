import "server-only";
import { platformPrisma } from "@/lib/prisma";
import { stripPort, extractSubdomain, isLocalDevHost } from "@/lib/tenant-host";
import type { Tenant } from "@/generated/prisma/client";

// Local dev / preview URLs (e.g. localhost:3000, a Vercel preview URL with no
// tenant subdomain configured) carry no tenant-identifying host at all, so we
// fall back to a single configurable default tenant instead of 404ing.
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "wisdomquant";

// The platform's own root domain, e.g. "wisdomlms.app" — used to detect
// "<subdomain>.wisdomlms.app" hosts and extract the subdomain. Custom domains
// (a tenant's own primaryDomain) are matched first and don't need this.
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "";
const TENANT_CACHE_TTL_MS = 60_000;
const UNKNOWN_HOST_CACHE_TTL_MS = 10_000;
const MAX_TENANT_CACHE_ENTRIES = 1_000;

type TenantCacheEntry = {
  expiresAt: number;
  value: Promise<Tenant | null>;
};

const tenantCache = new Map<string, TenantCacheEntry>();

function rememberTenant(
  host: string,
  lookup: () => Promise<Tenant | null>,
): Promise<Tenant | null> {
  const now = Date.now();
  const cached = tenantCache.get(host);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = lookup();
  tenantCache.set(host, { expiresAt: now + TENANT_CACHE_TTL_MS, value });
  void value.then((tenant) => {
    const current = tenantCache.get(host);
    if (current?.value === value && !tenant) {
      current.expiresAt = Date.now() + UNKNOWN_HOST_CACHE_TTL_MS;
    }
  }).catch(() => {
    if (tenantCache.get(host)?.value === value) tenantCache.delete(host);
  });

  if (tenantCache.size > MAX_TENANT_CACHE_ENTRIES) {
    const oldestKey = tenantCache.keys().next().value as string | undefined;
    if (oldestKey) tenantCache.delete(oldestKey);
  }

  return value;
}

// Resolves the active tenant for an incoming request host, in order:
// 1. Exact match against a tenant's custom primaryDomain.
// 2. "<subdomain>.<ROOT_DOMAIN>" match against a tenant's subdomain.
// 3. Local dev fallback to DEFAULT_TENANT_SLUG.
// Returns null if none match (caller should respond with 404 — an unknown
// host is never silently mapped to a tenant).
export async function resolveTenantFromHost(host: string): Promise<Tenant | null> {
  const bareHost = stripPort(host);
  const subdomain = extractSubdomain(host, ROOT_DOMAIN);
  const allowDefault = isLocalDevHost(host) || !ROOT_DOMAIN;
  const cacheKey = bareHost.toLowerCase();

  return rememberTenant(cacheKey, async () => {
    const candidates = await platformPrisma.tenant.findMany({
      where: {
        OR: [
          { primaryDomain: bareHost },
          ...(subdomain ? [{ subdomain }] : []),
          ...(allowDefault ? [{ slug: DEFAULT_TENANT_SLUG }] : []),
        ],
      },
      take: 3,
    });

    return (
      candidates.find((tenant) => tenant.primaryDomain === bareHost) ??
      (subdomain
        ? candidates.find((tenant) => tenant.subdomain === subdomain)
        : undefined) ??
      (allowDefault
        ? candidates.find((tenant) => tenant.slug === DEFAULT_TENANT_SLUG)
        : undefined) ??
      null
    );
  });
}

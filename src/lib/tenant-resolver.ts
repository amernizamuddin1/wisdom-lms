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

// Resolves the active tenant for an incoming request host, in order:
// 1. Exact match against a tenant's custom primaryDomain.
// 2. "<subdomain>.<ROOT_DOMAIN>" match against a tenant's subdomain.
// 3. Local dev fallback to DEFAULT_TENANT_SLUG.
// Returns null if none match (caller should respond with 404 — an unknown
// host is never silently mapped to a tenant).
export async function resolveTenantFromHost(host: string): Promise<Tenant | null> {
  const bareHost = stripPort(host);

  const byDomain = await platformPrisma.tenant.findUnique({ where: { primaryDomain: bareHost } });
  if (byDomain) return byDomain;

  const subdomain = extractSubdomain(host, ROOT_DOMAIN);
  if (subdomain) {
    const bySubdomain = await platformPrisma.tenant.findUnique({ where: { subdomain } });
    if (bySubdomain) return bySubdomain;
  }

  if (isLocalDevHost(host) || !ROOT_DOMAIN) {
    return platformPrisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } });
  }

  return null;
}

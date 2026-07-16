// Pure host-parsing helpers for tenant resolution — deliberately free of any
// Prisma/DB import so they (and tenant-resolver.test.ts) can be unit tested
// without constructing a database client.

export function stripPort(host: string): string {
  return host.split(":")[0];
}

export function extractSubdomain(host: string, rootDomain: string): string | null {
  if (!rootDomain) return null;
  const bareHost = stripPort(host);
  const bareRoot = stripPort(rootDomain);
  if (bareHost === bareRoot || !bareHost.endsWith(`.${bareRoot}`)) return null;
  const subdomain = bareHost.slice(0, -(bareRoot.length + 1));
  // A tenant's own subdomain never contains a dot (that'd be a nested/invalid host).
  if (!subdomain || subdomain.includes(".")) return null;
  return subdomain;
}

export function isLocalDevHost(host: string): boolean {
  const bareHost = stripPort(host);
  return bareHost === "localhost" || bareHost === "127.0.0.1" || bareHost.endsWith(".local");
}

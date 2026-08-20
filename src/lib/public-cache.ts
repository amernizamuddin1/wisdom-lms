import "server-only";
import { updateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant-context";

function tenantTag(tenantId: string, resource: string): string {
  return `tenant:${tenantId}:${resource}`;
}

export async function invalidatePublicBrandingCache(): Promise<void> {
  const tenantId = await getTenantId();
  updateTag(tenantTag(tenantId, "branding"));
}

export async function invalidatePublicCourseCache(): Promise<void> {
  const tenantId = await getTenantId();
  updateTag(tenantTag(tenantId, "courses"));
  // Bundle detail caches embed course titles and thumbnails.
  updateTag(tenantTag(tenantId, "bundles"));
}

export async function invalidatePublicBundleCache(): Promise<void> {
  const tenantId = await getTenantId();
  updateTag(tenantTag(tenantId, "bundles"));
}

import "server-only";
import { prisma } from "@/lib/prisma";
import type { CommerceEventType } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

// Fire-and-forget commerce funnel logging — never blocks or breaks the
// calling page/action if the write fails. Only called for authenticated
// users (see CommerceEvent's schema comment: there's no anonymous/session id
// anywhere in the app to key an anonymous view on, so anonymous PRODUCT_VIEWED
// events are not tracked — a documented Phase 3 limitation).
export function logCommerceEvent(params: {
  userId: string;
  type: CommerceEventType;
  courseId?: string | null;
  bundleId?: string | null;
  orderId?: string | null;
}): void {
  void (async () => {
    const tenantId = await getTenantId();
    await prisma.commerceEvent.create({
      data: {
        tenantId,
        userId: params.userId,
        type: params.type,
        courseId: params.courseId ?? null,
        bundleId: params.bundleId ?? null,
        orderId: params.orderId ?? null,
      },
    });
  })().catch(() => {});
}

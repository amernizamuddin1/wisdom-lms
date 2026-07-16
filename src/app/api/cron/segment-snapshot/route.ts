import { NextResponse, type NextRequest } from "next/server";
import { prisma, platformPrisma, runWithTenant } from "@/lib/prisma";
import { getAllLearnerSegments } from "@/lib/analytics/learner-segments";
import { dateKey } from "@/lib/analytics/date-range";

export const dynamic = "force-dynamic";

// Daily snapshot of every student's current engagement segment (classified by
// the existing, unmodified getAllLearnerSegments()). This is the only writer
// of UserSegmentSnapshot — segment history starts the day this first runs in
// a given deployment; nothing is backfilled. Safe to re-run for the same day
// (replaces today's rows), so a retried/duplicate invocation is a no-op.
//
// This route is exempted from proxy.ts's host-based tenant resolution (see
// isTenantExemptPath there) since Vercel Cron hits it directly, not via a
// tenant subdomain — so it must resolve tenants itself, looping over every
// ACTIVE tenant and running the whole snapshot under runWithTenant() for each,
// since getAllLearnerSegments() reads tenant-scoped tables internally.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = dateKey(new Date());
  const tenants = await platformPrisma.tenant.findMany({ where: { status: "ACTIVE" } });

  let totalLearners = 0;
  for (const tenant of tenants) {
    await runWithTenant(tenant.id, tenant.slug, async () => {
      const segments = await getAllLearnerSegments();

      await prisma.$transaction([
        prisma.userSegmentSnapshot.deleteMany({ where: { snapshotDate: today } }),
        prisma.userSegmentSnapshot.createMany({
          data: Array.from(segments.entries()).map(([userId, segment]) => ({
            userId,
            segment,
            snapshotDate: today,
            tenantId: tenant.id,
          })),
        }),
      ]);

      totalLearners += segments.size;
    });
  }

  return NextResponse.json({ ok: true, snapshotDate: today, tenants: tenants.length, learners: totalLearners });
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CommunityOverviewPage() {
  await requireAdmin();

  const [
    totalThreads,
    activeThreads,
    hiddenThreads,
    deletedThreads,
    openReports,
    activeRestrictions,
    recentLogs,
  ] = await Promise.all([
    prisma.discussionThread.count(),
    prisma.discussionThread.count({ where: { status: "ACTIVE" } }),
    prisma.discussionThread.count({ where: { status: "HIDDEN" } }),
    prisma.discussionThread.count({ where: { status: "DELETED" } }),
    prisma.discussionReport.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.communityUserRestriction.count({ where: { liftedAt: null } }),
    prisma.communityModerationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  const stats = [
    { label: "Total threads", value: totalThreads, href: "/admin/community/discussions" },
    { label: "Active threads", value: activeThreads, href: "/admin/community/discussions?status=ACTIVE" },
    { label: "Hidden threads", value: hiddenThreads, href: "/admin/community/discussions?status=HIDDEN" },
    { label: "Deleted threads", value: deletedThreads, href: "/admin/community/discussions?status=DELETED" },
    { label: "Open reports", value: openReports, href: "/admin/community/reports" },
    { label: "Active restrictions", value: activeRestrictions, href: "/admin/community/restricted-users" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Community</h2>
        <p className="text-sm text-muted-foreground">
          Overview of discussion activity, moderation queue, and settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Recent moderation activity</h3>
          <Link
            href="/admin/community/moderation-log"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            View full log
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <span className="font-medium text-foreground">{log.actionType}</span>
                <span className="text-muted-foreground">
                  {" "}
                  by {log.actor.name ?? log.actor.email}
                  {log.entityType ? ` on ${log.entityType.toLowerCase()}` : ""}
                </span>
              </div>
              <span className="text-muted-foreground">{log.createdAt.toLocaleString()}</span>
            </div>
          ))}
          {recentLogs.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No moderation activity yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

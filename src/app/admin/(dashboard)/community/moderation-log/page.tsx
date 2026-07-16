import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ScrollTextIcon } from "lucide-react";

const PAGE_SIZE = 30;

export default async function ModerationLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [logs, total] = await Promise.all([
    prisma.communityModerationLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
      },
    }),
    prisma.communityModerationLog.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Moderation Log</h2>
        <p className="text-sm text-muted-foreground">
          Append-only audit trail of every moderation action, newest first.
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollTextIcon} title="No moderation actions yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Target user</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {log.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-foreground">{log.actor.name ?? log.actor.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{log.actionType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.entityType ? `${log.entityType}${log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.targetUser ? log.targetUser.name ?? log.targetUser.email : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={(p) => `/admin/community/moderation-log?page=${p}`} />
    </div>
  );
}

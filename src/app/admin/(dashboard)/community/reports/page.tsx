import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FlagIcon } from "lucide-react";
import ReportActions from "./ReportActions";

const PAGE_SIZE = 20;

function statusVariant(status: string): "destructive" | "secondary" | "success" | "outline" {
  if (status === "OPEN") return "destructive";
  if (status === "UNDER_REVIEW") return "secondary";
  if (status === "RESOLVED") return "success";
  return "outline";
}

async function resolveThreadLink(entityType: string, entityId: string): Promise<string | null> {
  if (entityType === "THREAD") return `/admin/community/discussions/${entityId}`;
  if (entityType === "ANSWER") {
    const answer = await prisma.discussionAnswer.findUnique({ where: { id: entityId }, select: { threadId: true } });
    return answer ? `/admin/community/discussions/${answer.threadId}` : null;
  }
  if (entityType === "REPLY") {
    const reply = await prisma.discussionReply.findUnique({ where: { id: entityId }, select: { threadId: true } });
    return reply ? `/admin/community/discussions/${reply.threadId}` : null;
  }
  return null;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = status && status !== "ALL" ? { status: status as "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED" } : {};

  const [reports, total] = await Promise.all([
    prisma.discussionReport.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        reporter: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.discussionReport.count({ where }),
  ]);

  const links = await Promise.all(reports.map((r) => resolveThreadLink(r.entityType, r.entityId)));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Reports</h2>
        <p className="text-sm text-muted-foreground">Open and under-review reports appear first.</p>
      </div>

      <form method="get" className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? "ALL"}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="ALL">All</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-muted"
        >
          Apply
        </button>
      </form>

      {reports.length === 0 ? (
        <EmptyState icon={FlagIcon} title="No reports found" description="Try adjusting the status filter." />
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => (
            <div key={report.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                  <Badge variant="outline">{report.entityType}</Badge>
                  <span className="font-medium text-foreground">{report.reason}</span>
                  <span className="text-muted-foreground">
                    reported by {report.reporter.name ?? report.reporter.email}
                  </span>
                  <span className="text-xs text-muted-foreground">{report.createdAt.toLocaleString()}</span>
                </div>
                {links[i] && (
                  <Link href={links[i]!} className="text-sm text-primary underline-offset-2 hover:underline">
                    View content
                  </Link>
                )}
              </div>
              {report.details && <p className="text-sm text-muted-foreground">{report.details}</p>}
              {report.reviewedBy && (
                <p className="text-xs text-muted-foreground">
                  Reviewed by {report.reviewedBy.name ?? report.reviewedBy.email} at{" "}
                  {report.reviewedAt?.toLocaleString()}
                  {report.resolutionNotes ? ` — ${report.resolutionNotes}` : ""}
                </p>
              )}
              {(report.status === "OPEN" || report.status === "UNDER_REVIEW") && (
                <ReportActions reportId={report.id} status={report.status} />
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => `/admin/community/reports?${status ? `status=${status}&` : ""}page=${p}`}
      />
    </div>
  );
}

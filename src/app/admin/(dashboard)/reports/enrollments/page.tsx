import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import ReportFilterForm from "./ReportFilterForm";
import DownloadCsvButton from "./DownloadCsvButton";
import { fetchEnrollmentReportRows, SOURCE_LABELS, type EnrollmentReportParams } from "./queries";

export default async function EnrollmentReportsPage({
  searchParams,
}: {
  searchParams: Promise<EnrollmentReportParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [rows, courses, bundles] = await Promise.all([
    fetchEnrollmentReportRows(params),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.courseBundle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Enrollment Reports</h1>
          <p className="text-sm text-muted-foreground">
            Filter and export enrollment data across every course and bundle.
          </p>
        </div>
        <DownloadCsvButton params={params} />
      </div>

      <ReportFilterForm
        courses={courses}
        bundles={bundles}
        defaults={{
          scope: params.scope ?? "all",
          courseId: params.courseId ?? "",
          bundleId: params.bundleId ?? "",
          status: params.status ?? "any",
          email: params.email ?? "",
          enrolledFrom: params.enrolledFrom ?? "",
          enrolledTo: params.enrolledTo ?? "",
          accessFrom: params.accessFrom ?? "",
          accessTo: params.accessTo ?? "",
        }}
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Learner</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Source Bundle</th>
              <th className="px-4 py-3 font-medium">Enrolled</th>
              <th className="px-4 py-3 font-medium">Access Start</th>
              <th className="px-4 py-3 font-medium">Access End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{e.user.name}</div>
                  <div className="text-xs text-muted-foreground">{e.user.email}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{e.course.title}</td>
                <td className="px-4 py-3">
                  <Badge variant={e.status === "ACTIVE" ? "success" : "outline"}>{e.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{SOURCE_LABELS[e.source]}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.sourceBundle?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.enrolledAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.accessStartAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.isPermanent || !e.accessEndAt ? "Permanent" : e.accessEndAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No enrollments match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

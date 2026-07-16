import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import type { EnrollmentSource } from "@/generated/prisma/client";
import CourseEnrollmentsTable, { type CourseGrantRow } from "./CourseEnrollmentsTable";
import BundleEnrollmentsTable, { type BundleEnrollmentRow } from "./BundleEnrollmentsTable";

const SOURCE_LABEL: Record<EnrollmentSource, string> = {
  DIRECT: "Direct Purchase",
  BUNDLE: "Bundle Purchase",
  ADMIN_ASSIGNED: "Admin Assignment",
  CSV_IMPORT: "CSV Import",
  FREE_CHECKOUT: "Free Enrollment",
};

function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString() : "—";
}

export default async function AdminSubscriberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const subscriber = await prisma.user.findUnique({ where: { id } });
  if (!subscriber) notFound();

  const [grants, bundleEnrollments, lastLogin] = await Promise.all([
    prisma.enrollmentGrant.findMany({
      where: { enrollment: { userId: id } },
      include: { enrollment: { include: { course: true } }, sourceOrder: true },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.bundleEnrollment.findMany({
      where: { userId: id },
      include: { bundle: { include: { courses: { include: { course: true } } } } },
      orderBy: { enrolledAt: "desc" },
    }),
    createAdminClient()
      .auth.admin.getUserById(id)
      .then((res) => res.data.user?.last_sign_in_at ?? null)
      .catch(() => null),
  ]);

  const courseRows: CourseGrantRow[] = grants.map((g) => ({
    id: g.id,
    courseTitle: g.enrollment.course.title,
    source: SOURCE_LABEL[g.source],
    grantedAt: formatDate(g.grantedAt),
    accessStartAt: formatDate(g.accessStartAt),
    accessEndAt: g.isPermanent ? "Forever" : formatDate(g.accessEndAt),
    status: g.status,
    reference: g.sourceOrder?.orderNumber ?? "—",
  }));

  const bundleRows: BundleEnrollmentRow[] = bundleEnrollments.map((be) => ({
    id: be.id,
    bundleName: be.bundle.name,
    includedCourses: be.bundle.courses.map((bc) => bc.course.title).join(", ") || "—",
    enrolledAt: formatDate(be.enrolledAt),
    status: be.status,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users/subscribers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Subscribers
      </Link>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{subscriber.name}</h2>
            <p className="text-sm text-muted-foreground">{subscriber.email}</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Registered</dt>
            <dd className="text-foreground">{formatDate(subscriber.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last Login</dt>
            <dd className="text-foreground">{lastLogin ? formatDate(new Date(lastLogin)) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-foreground">{subscriber.role}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-foreground">{subscriber.phone ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <CourseEnrollmentsTable
        subscriberId={subscriber.id}
        subscriberName={subscriber.name}
        subscriberEmail={subscriber.email}
        rows={courseRows}
      />

      <BundleEnrollmentsTable
        subscriberId={subscriber.id}
        subscriberName={subscriber.name}
        subscriberEmail={subscriber.email}
        rows={bundleRows}
      />
    </div>
  );
}

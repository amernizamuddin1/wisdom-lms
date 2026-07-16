import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BulkEnrollWizard from "./BulkEnrollWizard";

export default async function BulkEnrollPage() {
  await requireAdmin();

  const [courses, bundles] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.courseBundle.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bulk Enroll via CSV</h1>
        <p className="text-sm text-muted-foreground">
          Enroll a list of learners into one course or bundle at once. Learners who don&apos;t
          already have an account are created automatically and emailed a temporary password.
        </p>
      </div>
      <BulkEnrollWizard
        courses={courses}
        bundles={bundles.map((b) => ({ id: b.id, title: b.name }))}
      />
    </div>
  );
}

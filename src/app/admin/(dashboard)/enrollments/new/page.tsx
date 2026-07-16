import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import EnrollLearnerForm from "./EnrollLearnerForm";

export default async function NewEnrollmentPage() {
  const courses = await prisma.course.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Enroll a Learner</h1>
          <p className="text-sm text-muted-foreground">
            Grant a learner access to a course and set how long that access lasts.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/enrollments/bulk-import">Bulk Enroll (CSV)</Link>
        </Button>
      </div>
      <EnrollLearnerForm courses={courses} />
    </div>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DuplicateCourseButton from "./DuplicateCourseButton";

export default async function CoursesPage() {
  await requireAdmin();

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: { prices: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Courses</h2>
        <Button asChild>
          <Link href="/admin/courses/new">New Course</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((course) => {
              const usd = course.prices.find((p) => p.currency === "USD");
              return (
                <tr key={course.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={course.status === "PUBLISHED" ? "success" : "secondary"}>
                      {course.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {course.isFree ? "Free" : usd ? `$${usd.amount}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <DuplicateCourseButton courseId={course.id} />
                  </td>
                </tr>
              );
            })}
            {courses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No courses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

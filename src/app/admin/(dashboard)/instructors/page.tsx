import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InstructorsManager from "./InstructorsManager";

export default async function InstructorsPage() {
  await requireAdmin();

  const instructors = await prisma.instructor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Instructors</h2>
        <p className="text-sm text-muted-foreground">
          Manage instructor profiles that can be assigned to courses.
        </p>
      </div>

      <InstructorsManager
        instructors={instructors.map((i) => ({
          id: i.id,
          name: i.name,
          title: i.title,
          bio: i.bio,
          avatarUrl: i.avatarUrl,
          courseCount: i._count.courses,
        }))}
      />
    </div>
  );
}

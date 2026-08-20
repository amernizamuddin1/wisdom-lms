import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CourseActions from "./CourseActions";
import CourseEditorTabs from "./CourseEditorTabs";

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [course, allInstructors] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      include: {
        prices: true,
        quizzes: { where: { chapterId: null }, orderBy: { title: "asc" } },
        chapters: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" } },
            quizzes: { orderBy: { title: "asc" } },
          },
        },
        instructors: { orderBy: { order: "asc" }, include: { instructor: true } },
      },
    }),
    prisma.instructor.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!course) notFound();

  const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  const toCurrencyPrice = (currency: "INR" | "USD" | "EUR") => {
    const p = course.prices.find((price) => price.currency === currency);
    return {
      amount: p?.amount.toString() ?? "",
      discountedPrice: p?.discountedPrice?.toString() ?? "",
      discountStartAt: toDateInput(p?.discountStartAt ?? null),
      discountEndAt: toDateInput(p?.discountEndAt ?? null),
      maxDiscountedEnrollments: p?.maxDiscountedEnrollments?.toString() ?? "",
      discountedEnrollmentsUsed: p?.discountedEnrollmentsUsed ?? 0,
    };
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{course.title}</h2>
        <CourseActions
          courseId={course.id}
          status={course.status}
          learningStatus={course.learningStatus}
        />
      </div>

      <CourseEditorTabs
        data={{
          courseId: course.id,
          basic: {
            title: course.title,
            shortDescription: course.shortDescription ?? "",
            description: course.description ?? "",
            isFree: course.isFree,
            tags: course.tags,
          },
          media: {
            thumbnailUrl: course.thumbnailUrl,
            previewVideoUrl: course.previewVideoUrl ?? "",
          },
          learning: {
            prerequisites: course.prerequisites,
            learningObjectives: course.learningObjectives,
            outcomes: course.outcomes,
            materialsIncluded: course.materialsIncluded,
            targetAudience: course.targetAudience,
          },
          curriculum: {
            chapters: course.chapters.map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
              lessons: chapter.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
              quizzes: chapter.quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title })),
            })),
            quizzes: course.quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title })),
          },
          instructors: {
            all: allInstructors.map((instructor) => ({
              id: instructor.id,
              name: instructor.name,
              title: instructor.title,
              avatarUrl: instructor.avatarUrl,
            })),
            selectedIds: course.instructors.map((courseInstructor) => courseInstructor.instructorId),
          },
          pricing: {
            isFree: course.isFree,
            inr: toCurrencyPrice("INR"),
            usd: toCurrencyPrice("USD"),
            eur: toCurrencyPrice("EUR"),
            meta: {
              level: course.level,
              durationMinutes: course.durationMinutes,
              certificateEnabled: course.certificateEnabled,
              isPermanentAccess: course.isPermanentAccess,
              accessDurationMonths: course.accessDurationMonths,
            },
          },
          publishing: { launchDate: toDateInput(course.launchDate) },
        }}
      />
    </div>
  );
}

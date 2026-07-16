import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseDetailsForm, CoursePricingForm } from "./CourseDetailsForm";
import { CourseLearningDetailsForm } from "./CourseLearningDetailsForm";
import { CoursePreviewVideoForm } from "./CoursePreviewVideoForm";
import { CourseMetaForm } from "./CourseMetaForm";
import { CourseInstructorsForm } from "./CourseInstructorsForm";
import { CourseLaunchDateForm } from "./CourseLaunchDateForm";
import ThumbnailUploader from "./ThumbnailUploader";
import CourseActions from "./CourseActions";
import ChaptersSection from "./ChaptersSection";
import CourseQuizzesSection from "./CourseQuizzesSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

      <Tabs defaultValue="basic">
        <TabsList className="flex-wrap">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="learning">Learning Details</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="instructor">Instructor</TabsTrigger>
          <TabsTrigger value="pricing">Pricing &amp; Access</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 pt-4">
          <CourseDetailsForm
            courseId={course.id}
            title={course.title}
            shortDescription={course.shortDescription ?? ""}
            description={course.description ?? ""}
            isFree={course.isFree}
            tags={course.tags}
          />
        </TabsContent>

        <TabsContent value="media" className="space-y-6 pt-4">
          <ThumbnailUploader courseId={course.id} thumbnailUrl={course.thumbnailUrl} />
          <CoursePreviewVideoForm courseId={course.id} previewVideoUrl={course.previewVideoUrl ?? ""} />
        </TabsContent>

        <TabsContent value="learning" className="space-y-6 pt-4">
          <CourseLearningDetailsForm
            courseId={course.id}
            prerequisites={course.prerequisites}
            learningObjectives={course.learningObjectives}
            outcomes={course.outcomes}
            materialsIncluded={course.materialsIncluded}
            targetAudience={course.targetAudience}
          />
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-6 pt-4">
          <div>
            <h3 className="mb-3 font-medium text-foreground">Chapters &amp; Lessons</h3>
            <ChaptersSection
              courseId={course.id}
              initialChapters={course.chapters.map((c) => ({
                id: c.id,
                title: c.title,
                lessons: c.lessons.map((l) => ({ id: l.id, title: l.title })),
                quizzes: c.quizzes.map((q) => ({ id: q.id, title: q.title })),
              }))}
            />
          </div>
          <CourseQuizzesSection courseId={course.id} quizzes={course.quizzes} />
        </TabsContent>

        <TabsContent value="instructor" className="space-y-6 pt-4">
          <CourseInstructorsForm
            courseId={course.id}
            allInstructors={allInstructors.map((i) => ({
              id: i.id,
              name: i.name,
              title: i.title,
              avatarUrl: i.avatarUrl,
            }))}
            selectedIds={course.instructors.map((ci) => ci.instructorId)}
          />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6 pt-4">
          {!course.isFree && (
            <CoursePricingForm
              courseId={course.id}
              inr={toCurrencyPrice("INR")}
              usd={toCurrencyPrice("USD")}
              eur={toCurrencyPrice("EUR")}
            />
          )}
          <CourseMetaForm
            courseId={course.id}
            level={course.level}
            durationMinutes={course.durationMinutes}
            certificateEnabled={course.certificateEnabled}
            isPermanentAccess={course.isPermanentAccess}
            accessDurationMonths={course.accessDurationMonths}
          />
        </TabsContent>

        <TabsContent value="publishing" className="space-y-6 pt-4">
          <CourseLaunchDateForm courseId={course.id} launchDate={toDateInput(course.launchDate)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

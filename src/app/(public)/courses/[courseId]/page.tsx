import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2Icon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOptionalUser } from "@/lib/auth";
import { getRazorpayCredentials } from "@/lib/settings";
import { logCommerceEvent } from "@/lib/commerce-events";
import { getBranding } from "@/lib/branding";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import PriceDisplay from "../../PriceDisplay";
import EnrollSection from "./EnrollSection";
import CoursePreviewMedia from "./CoursePreviewMedia";
import CourseDescription from "./CourseDescription";
import CourseCurriculum from "./CourseCurriculum";
import CourseMetaList from "./CourseMetaList";
import CourseInstructors from "./CourseInstructors";
import CourseSidebarList from "./CourseSidebarList";

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ALL_LEVELS: "All Levels",
};

async function getCourse(courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      description: true,
      isFree: true,
      thumbnailUrl: true,
      previewVideoUrl: true,
      learningStatus: true,
      level: true,
      tags: true,
      prerequisites: true,
      learningObjectives: true,
      outcomes: true,
      targetAudience: true,
      materialsIncluded: true,
      durationMinutes: true,
      certificateEnabled: true,
      isPermanentAccess: true,
      accessDurationMonths: true,
      launchDate: true,
      updatedAt: true,
      prices: {
        select: {
          currency: true,
          amount: true,
          discountedPrice: true,
          discountStartAt: true,
          discountEndAt: true,
          maxDiscountedEnrollments: true,
          discountedEnrollmentsUsed: true,
        },
      },
      instructors: {
        orderBy: { order: "asc" },
        select: { instructor: { select: { id: true, name: true, title: true, bio: true, avatarUrl: true } } },
      },
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, lessonType: true },
          },
          quizzes: { select: { id: true, title: true } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  const [course, branding] = await Promise.all([
    prisma.course.findFirst({
      where: { id: courseId, status: "PUBLISHED" },
      select: { title: true, shortDescription: true, description: true, thumbnailUrl: true },
    }),
    getBranding(),
  ]);

  if (!course) return { title: `Course not found | ${branding.platformName}` };

  const metaDescription = (course.shortDescription || course.description)?.slice(0, 160);

  return {
    title: `${course.title} | ${branding.platformName}`,
    description: metaDescription,
    openGraph: {
      title: course.title,
      description: metaDescription,
      images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [course, user, razorpayCreds] = await Promise.all([
    getCourse(courseId),
    getOptionalUser(),
    getRazorpayCredentials(),
  ]);

  if (!course) notFound();

  if (user) logCommerceEvent({ userId: user.id, type: "PRODUCT_VIEWED", courseId: course.id });

  const [enrollment, enrolledCount] = await Promise.all([
    user
      ? prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: user.id, courseId } },
          select: { status: true },
        })
      : Promise.resolve(null),
    prisma.enrollment.count({ where: { courseId, status: "ACTIVE" } }),
  ]);
  const isEnrolled = enrollment?.status === "ACTIVE";

  const allLessonIds = course.chapters.flatMap((c) => c.lessons.map((l) => l.id));
  const completedLessonIds =
    isEnrolled && user && allLessonIds.length > 0
      ? new Set(
          (
            await prisma.lessonProgress.findMany({
              where: { userId: user.id, lessonId: { in: allLessonIds }, completedAt: { not: null } },
              select: { lessonId: true },
            })
          ).map((p) => p.lessonId),
        )
      : new Set<string>();

  const totalLessons = course.chapters.reduce((n, c) => n + c.lessons.length, 0);
  const totalQuizzes = course.chapters.reduce((n, c) => n + c.quizzes.length, 0);
  const instructors = course.instructors.map((ci) => ci.instructor);

  return (
    <div className="mx-auto grid max-w-(--content-width) gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <CoursePreviewMedia
          title={course.title}
          thumbnailUrl={course.thumbnailUrl}
          previewVideoUrl={course.previewVideoUrl}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {course.level && <Badge variant="secondary">{LEVEL_LABELS[course.level]}</Badge>}
            {course.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="border-indigo/30 text-indigo">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
          {course.shortDescription && (
            <p className="font-body text-muted-foreground">{course.shortDescription}</p>
          )}
        </div>

        {course.description && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">About the Course</h2>
            <CourseDescription description={course.description} />
          </section>
        )}

        {course.learningObjectives.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">What You Will Learn</h2>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {course.learningObjectives.map((item, i) => (
                <li key={i} className="flex items-start gap-2 font-body text-sm text-foreground">
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {course.outcomes.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">After Completing This Course</h2>
            <ul className="list-inside list-disc font-body text-sm text-muted-foreground">
              {course.outcomes.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Course Curriculum</h2>
          <p className="font-body text-sm text-muted-foreground">
            {course.chapters.length} chapters &middot; {totalLessons} lessons
            {totalQuizzes > 0 && <> &middot; {totalQuizzes} quizzes</>}
          </p>
          <CourseCurriculum
            chapters={course.chapters}
            isEnrolled={isEnrolled}
            completedLessonIds={completedLessonIds}
          />
        </section>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-6">
        <Card>
          <CardContent className="space-y-4">
            <PriceDisplay isFree={course.isFree} prices={course.prices} />
            <EnrollSection
              courseId={course.id}
              isFree={course.isFree}
              isLoggedIn={Boolean(user)}
              isEnrolled={isEnrolled}
              razorpayConfigured={razorpayCreds !== null}
            />

            <CourseMetaList
              level={course.level}
              enrolledCount={enrolledCount}
              durationMinutes={course.durationMinutes}
              updatedAt={course.updatedAt}
              certificateEnabled={course.certificateEnabled}
              isPermanentAccess={course.isPermanentAccess}
              accessDurationMonths={course.accessDurationMonths}
            />

            <CourseInstructors instructors={instructors} />

            <CourseSidebarList title="Materials Included" items={course.materialsIncluded} />
            <CourseSidebarList title="Requirements" items={course.prerequisites} />

            {course.tags.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <h2 className="text-sm font-semibold text-foreground">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {course.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <CourseSidebarList title="Target Audience" items={course.targetAudience} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

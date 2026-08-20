import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { SearchIcon, XIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import GamificationSummaryWidget from "@/components/gamification/GamificationSummaryWidget";

const PAGE_SIZE = 8;

type CourseProgress = {
  completedLessonIds: Set<string>;
  passedQuizIds: Set<string>;
};

export default async function MyCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const tenantId = await getTenantId();
  const groupMembership = await prisma.groupMembership.findFirst({
    where: { tenantId, userId: user.id },
    select: { group: { select: { name: true } } },
  });

  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <h2 className="text-xl text-foreground">
        <span className="font-semibold">Hello, {firstName}</span>
        {groupMembership ? ` | ${groupMembership.group.name}` : " | Available Courses"}
      </h2>

      <Suspense
        fallback={
          <div
            className="h-[90px] animate-pulse rounded-xl border border-primary/25 bg-card"
            aria-label="Loading learning summary"
          />
        }
      >
        <GamificationSummaryWidget userId={user.id} />
      </Suspense>

      <Suspense
        fallback={
          <div
            className="h-64 animate-pulse rounded-xl border border-primary/25 bg-card"
            aria-label="Loading courses"
          />
        }
      >
        <CoursesSection userId={user.id} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CoursesSection({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const page = Math.max(1, Number(params.page) || 1);

  const where = {
    userId,
    status: "ACTIVE" as const,
    ...(q ? { course: { title: { contains: q, mode: "insensitive" as const } } } : {}),
  };

  const enrollmentsPromise = prisma.enrollment.findMany({
    where,
    select: {
      id: true,
      course: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          quizzes: { where: { chapterId: null }, select: { id: true } },
          chapters: {
            select: {
              lessons: { select: { id: true } },
              quizzes: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const totalPromise = prisma.enrollment.count({ where });
  const allEnrollmentCountPromise = q
    ? prisma.enrollment.count({ where: { userId, status: "ACTIVE" } })
    : Promise.resolve(0);

  // Only the enrollment rows are needed to emit the course cards and their
  // LCP image. Keep counts off the critical path unless this page is empty.
  const enrollments = await enrollmentsPromise;
  const hasAnyEnrollments = enrollments.length > 0
    ? true
    : q
      ? (await allEnrollmentCountPromise) > 0
      : (await totalPromise) > 0;

  const allLessonIds = enrollments.flatMap((e) =>
    e.course.chapters.flatMap((c) => c.lessons.map((l) => l.id)),
  );
  const allQuizIds = enrollments.flatMap((e) => [
    ...e.course.quizzes.map((q) => q.id),
    ...e.course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
  ]);

  // Start progress lookup without blocking the course-card thumbnails. The
  // card shell can stream as soon as enrollment data is ready, allowing the
  // browser to discover and fetch the LCP image during this second DB round.
  const progressPromise: Promise<CourseProgress> = Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: allLessonIds },
        completedAt: { not: null },
      },
      select: { lessonId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, quizId: { in: allQuizIds }, passed: true },
      select: { quizId: true },
    }),
  ]).then(([completedLessons, passedAttempts]) => ({
    completedLessonIds: new Set(completedLessons.map((l) => l.lessonId)),
    passedQuizIds: new Set(passedAttempts.map((a) => a.quizId)),
  }));

  return (
    <>
      {hasAnyEnrollments && (
        <form action="/dashboard" method="get" className="max-w-sm">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search your courses..."
              className={q ? "pr-9 pl-9" : "pl-9"}
            />
            {q && (
              <Link
                href="/dashboard"
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </Link>
            )}
          </div>
        </form>
      )}

      {!hasAnyEnrollments ? (
        <p className="text-muted-foreground">
          You&apos;re not enrolled in any courses yet.
        </p>
      ) : enrollments.length === 0 ? (
        <p className="text-muted-foreground">
          No courses match &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 justify-start gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(320px,420px))]">
            {enrollments.map((enrollment, index) => {
              const course = enrollment.course;
              const lessonIds = course.chapters.flatMap((c) =>
                c.lessons.map((l) => l.id),
              );
              const quizIds = [
                ...course.quizzes.map((q) => q.id),
                ...course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
              ];

              return (
                <div
                  key={enrollment.id}
                  className={cn(
                    "group flex w-full flex-col overflow-hidden",
                    cardVariants({ variant: "course" }),
                  )}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        sizes="(min-width: 1024px) 420px, (min-width: 768px) calc((100vw - 140px) / 2), (min-width: 640px) calc((100vw - 68px) / 2), calc(100vw - 48px)"
                        quality={60}
                        className="object-contain transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] motion-safe:group-hover:scale-[1.04]"
                        {...(index === 0 ? { preload: true } : { loading: "lazy" as const })}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        No thumbnail
                      </div>
                    )}
                  </div>

                  <Suspense fallback={<CourseDetailsSkeleton title={course.title} />}>
                    <CourseDetails
                      courseId={course.id}
                      title={course.title}
                      lessonIds={lessonIds}
                      quizIds={quizIds}
                      progressPromise={progressPromise}
                    />
                  </Suspense>
                </div>
              );
            })}
          </div>

          <Suspense fallback={null}>
            <CoursesPagination
              page={page}
              q={q}
              totalPromise={totalPromise}
            />
          </Suspense>
        </>
      )}
    </>
  );
}

async function CoursesPagination({
  page,
  q,
  totalPromise,
}: {
  page: number;
  q: string;
  totalPromise: Promise<number>;
}) {
  const total = await totalPromise;

  function buildHref(nextPage: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  return (
    <Pagination
      page={page}
      pageSize={PAGE_SIZE}
      total={total}
      buildHref={buildHref}
    />
  );
}

function CourseDetailsSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-2 p-3">
      <h3 className="line-clamp-2 text-sm font-medium text-foreground">{title}</h3>
      <div className="space-y-1" aria-label="Loading course progress">
        <div className="h-1.5 w-full animate-pulse rounded-full bg-surface-tertiary" />
        <div className="h-4 w-20 animate-pulse rounded bg-surface-tertiary" />
      </div>
      <div className="h-8 w-full animate-pulse rounded-lg bg-surface-tertiary" />
    </div>
  );
}

async function CourseDetails({
  courseId,
  title,
  lessonIds,
  quizIds,
  progressPromise,
}: {
  courseId: string;
  title: string;
  lessonIds: string[];
  quizIds: string[];
  progressPromise: Promise<CourseProgress>;
}) {
  const { completedLessonIds, passedQuizIds } = await progressPromise;
  const totalItems = lessonIds.length + quizIds.length;
  const completedItems =
    lessonIds.filter((id) => completedLessonIds.has(id)).length +
    quizIds.filter((id) => passedQuizIds.has(id)).length;
  const percent = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : 0;

  return (
    <div className="space-y-2 p-3">
      <h3 className="line-clamp-2 text-sm font-medium text-foreground">{title}</h3>
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{percent}% complete</p>
      </div>
      <Button asChild size="sm" className="w-full">
        <Link href={`/dashboard/courses/${courseId}`}>
          {percent > 0 ? "Continue Course" : "Start Course"}
        </Link>
      </Button>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import GamificationSummaryWidget from "@/components/gamification/GamificationSummaryWidget";

const PAGE_SIZE = 8;

export default async function MyCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const page = Math.max(1, Number(params.page) || 1);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      ...(q ? { course: { title: { contains: q, mode: "insensitive" } } } : {}),
    },
    include: {
      course: {
        include: {
          quizzes: { where: { chapterId: null } },
          chapters: {
            include: {
              lessons: true,
              quizzes: true,
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const hasAnyEnrollments =
    enrollments.length > 0 ||
    !q ||
    (await prisma.enrollment.count({
      where: { userId: user.id, status: "ACTIVE" },
    })) > 0;

  const allLessonIds = enrollments.flatMap((e) =>
    e.course.chapters.flatMap((c) => c.lessons.map((l) => l.id)),
  );
  const allQuizIds = enrollments.flatMap((e) => [
    ...e.course.quizzes.map((q) => q.id),
    ...e.course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
  ]);

  const [completedLessons, passedAttempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: allLessonIds },
        completedAt: { not: null },
      },
      select: { lessonId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, quizId: { in: allQuizIds }, passed: true },
      select: { quizId: true },
    }),
  ]);

  const completedLessonIds = new Set(completedLessons.map((l) => l.lessonId));
  const passedQuizIds = new Set(passedAttempts.map((a) => a.quizId));

  const total = enrollments.length;
  const pagedEnrollments = enrollments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  function buildHref(overrides: { page?: number }): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    const nextPage = overrides.page ?? page;
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">My Courses</h2>

      <GamificationSummaryWidget userId={user.id} />

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
            {pagedEnrollments.map((enrollment, index) => {
              const course = enrollment.course;
              const lessonIds = course.chapters.flatMap((c) =>
                c.lessons.map((l) => l.id),
              );
              const quizIds = [
                ...course.quizzes.map((q) => q.id),
                ...course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
              ];

              const totalItems = lessonIds.length + quizIds.length;
              const completedItems =
                lessonIds.filter((id) => completedLessonIds.has(id)).length +
                quizIds.filter((id) => passedQuizIds.has(id)).length;

              const percent =
                totalItems > 0
                  ? Math.round((completedItems / totalItems) * 100)
                  : 0;

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
                        className="object-contain transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] motion-safe:group-hover:scale-[1.04]"
                        preload={index === 0}
                        fetchPriority={index === 0 ? "high" : undefined}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        No thumbnail
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">
                      {course.title}
                    </h3>

                    <div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {percent}% complete
                      </p>
                    </div>

                    <Button asChild size="sm" className="w-full">
                      <Link href={`/dashboard/courses/${course.id}`}>
                        {percent > 0 ? "Continue Course" : "Start Course"}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            buildHref={(p) => buildHref({ page: p })}
          />
        </>
      )}
    </div>
  );
}

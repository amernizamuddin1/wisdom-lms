import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon, FileTextIcon, MessageSquareIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { isAccessExpired } from "@/lib/access";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import VideoLessonPlayer from "./VideoLessonPlayer";
import AudioLessonPlayer from "./AudioLessonPlayer";
import MarkCompleteButton from "./MarkCompleteButton";
import CourseAccessNotice from "./CourseAccessNotice";
import CourseSidebarNav from "./CourseSidebarNav";
import MobileCourseDrawer from "./MobileCourseDrawer";
import LessonTimeTracker from "@/components/gamification/LessonTimeTracker";

export default async function CourseViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const user = await requireUser();
  const { courseId } = await params;
  const { lesson: selectedLessonId } = await searchParams;

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId, status: "ACTIVE" },
  });
  if (!enrollment) notFound();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      quizzes: { where: { chapterId: null }, orderBy: { title: "asc" } },
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" }, include: { files: true } },
          quizzes: { orderBy: { title: "asc" } },
        },
      },
    },
  });
  if (!course) notFound();

  if (course.learningStatus === "PAUSED") {
    return <CourseAccessNotice title={course.title} variant="paused" />;
  }
  if (isAccessExpired(enrollment)) {
    return <CourseAccessNotice title={course.title} variant="expired" accessEndAt={enrollment.accessEndAt} />;
  }

  const allLessons = course.chapters.flatMap((c) => c.lessons);
  const allQuizIds = [
    ...course.quizzes.map((q) => q.id),
    ...course.chapters.flatMap((c) => c.quizzes.map((q) => q.id)),
  ];

  const [completedLessons, passedAttempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: allLessons.map((l) => l.id) },
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

  const activeLesson =
    allLessons.find((l) => l.id === selectedLessonId) ?? allLessons[0] ?? null;
  const isActiveLessonCompleted = activeLesson ? completedLessonIds.has(activeLesson.id) : false;

  let signedFiles: { id: string; fileName: string; url: string | null }[] = [];
  let audioUrl: string | null = null;

  if (activeLesson && (activeLesson.files.length > 0 || activeLesson.lessonType === "AUDIO")) {
    const supabase = createAdminClient();

    if (activeLesson.files.length > 0) {
      signedFiles = await Promise.all(
        activeLesson.files.map(async (file) => {
          const { data } = await supabase.storage
            .from("lesson-files")
            .createSignedUrl(file.fileUrl, 600);
          return { id: file.id, fileName: file.fileName, url: data?.signedUrl ?? null };
        }),
      );
    }

    if (activeLesson.lessonType === "AUDIO" && activeLesson.videoUrl) {
      // Audio is either a full external URL, or a private storage path that
      // needs a signed URL — same distinction as the admin upload preview.
      if (/^https?:\/\//i.test(activeLesson.videoUrl)) {
        audioUrl = activeLesson.videoUrl;
      } else {
        const { data } = await supabase.storage
          .from("lesson-files")
          .createSignedUrl(activeLesson.videoUrl, 600);
        audioUrl = data?.signedUrl ?? null;
      }
    }
  }

  const sidebarChapters = course.chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    lessons: chapter.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
    quizzes: chapter.quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title })),
  }));
  const sidebarCourseQuizzes = course.quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title }));
  const completedLessonIdList = [...completedLessonIds];
  const passedQuizIdList = [...passedQuizIds];

  return (
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6">
      <div className="mb-4 lg:hidden">
        <MobileCourseDrawer
          courseId={courseId}
          courseTitle={course.title}
          activeLessonTitle={activeLesson?.title ?? null}
          chapters={sidebarChapters}
          courseQuizzes={sidebarCourseQuizzes}
          activeLessonId={activeLesson?.id ?? null}
          completedLessonIds={completedLessonIdList}
          passedQuizIds={passedQuizIdList}
        />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="space-y-1 px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Course Content
            </p>
            <h2 className="break-words text-lg font-semibold leading-snug text-primary">
              {course.title}
            </h2>
          </div>
          <CourseSidebarNav
            courseId={courseId}
            chapters={sidebarChapters}
            courseQuizzes={sidebarCourseQuizzes}
            activeLessonId={activeLesson?.id ?? null}
            completedLessonIds={completedLessonIdList}
            passedQuizIds={passedQuizIdList}
          />
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mx-auto w-full max-w-[1100px] space-y-4">
          {!activeLesson ? (
            <p className="text-muted-foreground">This course has no lessons yet.</p>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card">
              <LessonTimeTracker
                courseId={courseId}
                lessonId={activeLesson.id}
                isVideo={activeLesson.lessonType === "VIDEO"}
              />
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold text-foreground">{activeLesson.title}</h3>
                {activeLesson.lessonType === "TEXT" ? (
                  <MarkCompleteButton
                    courseId={courseId}
                    lessonId={activeLesson.id}
                    completed={isActiveLessonCompleted}
                    label="Mark as Read"
                    completedLabel="Read"
                  />
                ) : (
                  <MarkCompleteButton
                    courseId={courseId}
                    lessonId={activeLesson.id}
                    completed={isActiveLessonCompleted}
                    variant="success"
                  />
                )}
              </div>

              {activeLesson.lessonType === "VIDEO" &&
                activeLesson.videoUrl &&
                activeLesson.videoSourceType && (
                  <VideoLessonPlayer
                    courseId={courseId}
                    lessonId={activeLesson.id}
                    videoUrl={activeLesson.videoUrl}
                    sourceType={activeLesson.videoSourceType}
                    completed={isActiveLessonCompleted}
                  />
                )}

              {activeLesson.lessonType === "AUDIO" && audioUrl && (
                <AudioLessonPlayer
                  courseId={courseId}
                  lessonId={activeLesson.id}
                  audioUrl={audioUrl}
                  completed={isActiveLessonCompleted}
                />
              )}

              {activeLesson.lessonType === "TEXT" && activeLesson.textContent && (
                <div
                  className="text-sm text-foreground [&_a]:text-primary [&_a]:underline [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeLessonHtml(activeLesson.textContent),
                  }}
                />
              )}

              <Tabs defaultValue="instructions">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TabsList>
                    <TabsTrigger value="instructions">
                      <FileTextIcon />
                      Instructions
                    </TabsTrigger>
                    <TabsTrigger value="files">
                      <DownloadIcon />
                      Downloadable Assets
                    </TabsTrigger>
                  </TabsList>
                  <Button asChild size="lg" className="min-h-11">
                    <Link href={`/dashboard/courses/${courseId}/discussion`}>
                      <MessageSquareIcon />
                      Discussion Board
                    </Link>
                  </Button>
                </div>
                <TabsContent value="instructions" className="pt-2">
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm text-foreground">
                    {activeLesson.instructions ? (
                      <p className="whitespace-pre-wrap">{activeLesson.instructions}</p>
                    ) : (
                      <p className="text-muted-foreground">No instructions for this lesson.</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="files" className="pt-2">
                  <div className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-warning">
                    {signedFiles.length > 0 ? (
                      <ul className="space-y-1">
                        {signedFiles.map((file) =>
                          file.url ? (
                            <li key={file.id}>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm font-medium underline-offset-2 hover:underline"
                              >
                                <DownloadIcon className="size-4" />
                                {file.fileName}
                              </a>
                            </li>
                          ) : null,
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm opacity-80">No downloadable files for this lesson.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

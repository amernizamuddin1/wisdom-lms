import CourseSidebarNav from "../CourseSidebarNav";
import MobileCourseDrawer from "../MobileCourseDrawer";
import type { getCourseShell } from "./course-shell";

// Same lg:grid two-column layout as the lesson page
// (src/app/dashboard/courses/[courseId]/page.tsx) so the discussion tab
// doesn't look bolted on — same sidebar, same breakpoints.
export default function DiscussionPageShell({
  courseId,
  shell,
  children,
}: {
  courseId: string;
  shell: Awaited<ReturnType<typeof getCourseShell>>;
  children: React.ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6">
      <div className="mb-4 lg:hidden">
        <MobileCourseDrawer
          courseId={courseId}
          courseTitle={shell.course.title}
          activeLessonTitle={null}
          chapters={shell.sidebarChapters}
          courseQuizzes={shell.sidebarCourseQuizzes}
          activeLessonId={null}
          completedLessonIds={shell.completedLessonIds}
          passedQuizIds={shell.passedQuizIds}
        />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="break-words text-lg font-semibold leading-snug text-foreground">
            {shell.course.title}
          </h2>
          <CourseSidebarNav
            courseId={courseId}
            chapters={shell.sidebarChapters}
            courseQuizzes={shell.sidebarCourseQuizzes}
            activeLessonId={null}
            completedLessonIds={shell.completedLessonIds}
            passedQuizIds={shell.passedQuizIds}
          />
        </div>
      </aside>

      <section className="min-w-0 space-y-4">{children}</section>
    </div>
  );
}

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
    <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
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
          activePanel="discussion"
        />
      </div>

      <aside className="hidden space-y-4 lg:block">
        <h2 className="text-lg font-semibold text-foreground">{shell.course.title}</h2>
        <CourseSidebarNav
          courseId={courseId}
          chapters={shell.sidebarChapters}
          courseQuizzes={shell.sidebarCourseQuizzes}
          activeLessonId={null}
          completedLessonIds={shell.completedLessonIds}
          passedQuizIds={shell.passedQuizIds}
          activePanel="discussion"
        />
      </aside>

      <section className="space-y-4">{children}</section>
    </div>
  );
}

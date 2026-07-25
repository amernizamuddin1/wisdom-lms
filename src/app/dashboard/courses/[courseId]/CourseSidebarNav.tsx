"use client";

import Link from "next/link";
import { HelpCircleIcon, PlayCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Lesson = { id: string; title: string };
type Quiz = { id: string; title: string };
type Chapter = { id: string; title: string; lessons: Lesson[]; quizzes: Quiz[] };

export default function CourseSidebarNav({
  courseId,
  chapters,
  courseQuizzes,
  activeLessonId,
  completedLessonIds,
  passedQuizIds,
  onNavigate,
}: {
  courseId: string;
  chapters: Chapter[];
  courseQuizzes: Quiz[];
  activeLessonId: string | null;
  completedLessonIds: string[];
  passedQuizIds: string[];
  onNavigate?: () => void;
}) {
  const completedSet = new Set(completedLessonIds);
  const passedSet = new Set(passedQuizIds);

  return (
    <div className="space-y-5">
      {chapters.map((chapter, index) => {
        const chapterLessonCount = chapter.lessons.length;
        const chapterCompletedCount = chapter.lessons.filter((l) => completedSet.has(l.id)).length;
        return (
          <div
            key={chapter.id}
            className={cn("space-y-1.5", index > 0 && "border-t border-border-subtle pt-4")}
          >
            <div className="flex items-baseline justify-between gap-2 px-2">
              <p className="line-clamp-2 text-xs font-semibold text-foreground" title={chapter.title}>
                {chapter.title}
              </p>
              {chapterLessonCount > 0 && (
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                  {chapterCompletedCount}/{chapterLessonCount}
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {chapter.lessons.map((lesson) => {
                const isDone = completedSet.has(lesson.id);
                const isActive = activeLessonId === lesson.id;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/dashboard/courses/${courseId}?lesson=${lesson.id}`}
                      onClick={onNavigate}
                      title={lesson.title}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-xs transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <PlayCircleIcon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          isActive ? "text-primary-foreground" : isDone ? "text-success" : "text-primary",
                        )}
                      />
                      <span className="line-clamp-2 min-w-0 flex-1 break-words leading-snug">
                        {lesson.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {chapter.quizzes.map((quiz) => (
                <li key={quiz.id}>
                  <Link
                    href={`/quiz/${quiz.id}`}
                    onClick={onNavigate}
                    title={quiz.title}
                    className="flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-xs text-foreground hover:bg-muted"
                  >
                    <HelpCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2 min-w-0 flex-1 break-words leading-snug">
                      {quiz.title}
                    </span>
                    <Badge variant={passedSet.has(quiz.id) ? "success" : "secondary"} className="shrink-0">
                      {passedSet.has(quiz.id) ? "Passed" : "Quiz"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {courseQuizzes.length > 0 && (
        <div className={cn("space-y-1.5", chapters.length > 0 && "border-t border-border-subtle pt-4")}>
          <p className="px-2 text-xs font-semibold text-foreground">Course Quizzes</p>
          <ul className="space-y-1">
            {courseQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/quiz/${quiz.id}`}
                  onClick={onNavigate}
                  title={quiz.title}
                  className="flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-xs text-foreground hover:bg-muted"
                >
                  <HelpCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2 min-w-0 flex-1 break-words leading-snug">
                    {quiz.title}
                  </span>
                  <Badge variant={passedSet.has(quiz.id) ? "success" : "secondary"} className="shrink-0">
                    {passedSet.has(quiz.id) ? "Passed" : "Quiz"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

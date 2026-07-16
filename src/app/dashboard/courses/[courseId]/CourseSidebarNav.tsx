"use client";

import Link from "next/link";
import { CheckCircle2Icon, CircleIcon, HelpCircleIcon, MessageSquareIcon } from "lucide-react";
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
  activePanel,
  onNavigate,
}: {
  courseId: string;
  chapters: Chapter[];
  courseQuizzes: Quiz[];
  activeLessonId: string | null;
  completedLessonIds: string[];
  passedQuizIds: string[];
  /** Highlights a non-lesson nav entry (e.g. the discussion tab) as active. */
  activePanel?: "discussion";
  onNavigate?: () => void;
}) {
  const completedSet = new Set(completedLessonIds);
  const passedSet = new Set(passedQuizIds);

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/courses/${courseId}/discussion`}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
          activePanel === "discussion"
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <MessageSquareIcon className="size-4 shrink-0" />
        Discussion
      </Link>

      {chapters.map((chapter) => (
        <div key={chapter.id} className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{chapter.title}</p>
          <ul className="space-y-1">
            {chapter.lessons.map((lesson) => {
              const isDone = completedSet.has(lesson.id);
              const isActive = activeLessonId === lesson.id;
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/dashboard/courses/${courseId}?lesson=${lesson.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-success" />
                    ) : (
                      <CircleIcon
                        className={cn(
                          "size-4 shrink-0",
                          isActive ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </Link>
                </li>
              );
            })}
            {chapter.quizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/quiz/${quiz.id}`}
                  onClick={onNavigate}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                >
                  <HelpCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{quiz.title}</span>
                  <Badge variant={passedSet.has(quiz.id) ? "success" : "secondary"}>
                    {passedSet.has(quiz.id) ? "Passed" : "Quiz"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {courseQuizzes.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Course Quizzes</p>
          <ul className="space-y-1">
            {courseQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/quiz/${quiz.id}`}
                  onClick={onNavigate}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                >
                  <HelpCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{quiz.title}</span>
                  <Badge variant={passedSet.has(quiz.id) ? "success" : "secondary"}>
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

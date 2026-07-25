"use client";

import Link from "next/link";
import { HelpCircleIcon, PlayCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  const activeChapterId = chapters.find((c) => c.lessons.some((l) => l.id === activeLessonId))?.id;
  const defaultOpen = activeChapterId
    ? [activeChapterId]
    : chapters.length > 0
      ? [chapters[0].id]
      : [];

  return (
    <div className="space-y-5">
      <Accordion type="multiple" defaultValue={defaultOpen}>
        {chapters.map((chapter) => {
          const chapterLessonCount = chapter.lessons.length;
          const chapterCompletedCount = chapter.lessons.filter((l) => completedSet.has(l.id)).length;
          return (
            <AccordionItem key={chapter.id} value={chapter.id} className="border-b-0">
              <AccordionTrigger className="gap-2 px-2 py-2.5 hover:no-underline">
                <span className="flex flex-1 items-baseline justify-between gap-2 text-left">
                  <span
                    className="line-clamp-2 text-sm font-semibold text-foreground sm:text-base"
                    title={chapter.title}
                  >
                    {chapter.title}
                  </span>
                  {chapterLessonCount > 0 && (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {chapterCompletedCount}/{chapterLessonCount}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-2">
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
                            "flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <PlayCircleIcon
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              isActive
                                ? "text-primary-foreground"
                                : isDone
                                  ? "text-success"
                                  : "text-primary",
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
                        className="flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-sm text-foreground hover:bg-muted"
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
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {courseQuizzes.length > 0 && (
        <div className={cn("space-y-1.5", chapters.length > 0 && "border-t border-border-subtle pt-4")}>
          <p className="px-2 text-sm font-semibold text-foreground sm:text-base">Course Quizzes</p>
          <ul className="space-y-1">
            {courseQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/quiz/${quiz.id}`}
                  onClick={onNavigate}
                  title={quiz.title}
                  className="flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-sm text-foreground hover:bg-muted"
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

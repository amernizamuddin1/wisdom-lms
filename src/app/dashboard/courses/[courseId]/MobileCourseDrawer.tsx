"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import CourseSidebarNav from "./CourseSidebarNav";

type Lesson = { id: string; title: string };
type Quiz = { id: string; title: string };
type Chapter = { id: string; title: string; lessons: Lesson[]; quizzes: Quiz[] };

export default function MobileCourseDrawer({
  courseId,
  courseTitle,
  activeLessonTitle,
  chapters,
  courseQuizzes,
  activeLessonId,
  completedLessonIds,
  passedQuizIds,
}: {
  courseId: string;
  courseTitle: string;
  activeLessonTitle: string | null;
  chapters: Chapter[];
  courseQuizzes: Quiz[];
  activeLessonId: string | null;
  completedLessonIds: string[];
  passedQuizIds: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <MenuIcon className="size-4" />
              Course Content
            </span>
            {activeLessonTitle && (
              <span className="max-w-[50%] truncate text-xs text-muted-foreground">
                {activeLessonTitle}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[85%] overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{courseTitle}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <CourseSidebarNav
              courseId={courseId}
              chapters={chapters}
              courseQuizzes={courseQuizzes}
              activeLessonId={activeLessonId}
              completedLessonIds={completedLessonIds}
              passedQuizIds={passedQuizIds}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

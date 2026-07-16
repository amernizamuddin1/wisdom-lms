import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2Icon, FileTextIcon, HelpCircleIcon, LockIcon, PlayCircleIcon, Volume2Icon } from "lucide-react";

type LessonRow = { id: string; title: string; lessonType: "VIDEO" | "AUDIO" | "TEXT" };
type QuizRow = { id: string; title: string };
type ChapterRow = { id: string; title: string; lessons: LessonRow[]; quizzes: QuizRow[] };

function LessonTypeIcon({ type }: { type: LessonRow["lessonType"] }) {
  if (type === "AUDIO") return <Volume2Icon className="size-4 shrink-0" />;
  if (type === "TEXT") return <FileTextIcon className="size-4 shrink-0" />;
  return <PlayCircleIcon className="size-4 shrink-0" />;
}

export default function CourseCurriculum({
  chapters,
  isEnrolled,
  completedLessonIds,
}: {
  chapters: ChapterRow[];
  isEnrolled: boolean;
  completedLessonIds: Set<string>;
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={chapters[0] ? [chapters[0].id] : []}
      className="rounded-lg border"
    >
      {chapters.map((chapter, index) => {
        const itemCount = chapter.lessons.length + chapter.quizzes.length;
        return (
          <AccordionItem key={chapter.id} value={chapter.id} className="px-4">
            <AccordionTrigger>
              <span className="flex flex-1 items-baseline gap-2 text-foreground">
                <span className="text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}.
                </span>
                {chapter.title}
                <span className="text-xs font-normal text-muted-foreground">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1.5">
                {chapter.lessons.map((lesson) => {
                  const completed = completedLessonIds.has(lesson.id);
                  return (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-2 font-body text-sm text-muted-foreground"
                    >
                      {isEnrolled ? (
                        completed ? (
                          <CheckCircle2Icon className="size-4 shrink-0 text-success" />
                        ) : (
                          <LessonTypeIcon type={lesson.lessonType} />
                        )
                      ) : (
                        <LockIcon className="size-4 shrink-0" />
                      )}
                      <span className={completed ? "text-foreground" : undefined}>
                        {lesson.title}
                      </span>
                    </li>
                  );
                })}
                {chapter.quizzes.map((quiz) => (
                  <li
                    key={quiz.id}
                    className="flex items-center gap-2 font-body text-sm text-muted-foreground"
                  >
                    {isEnrolled ? (
                      <HelpCircleIcon className="size-4 shrink-0" />
                    ) : (
                      <LockIcon className="size-4 shrink-0" />
                    )}
                    Quiz: {quiz.title}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

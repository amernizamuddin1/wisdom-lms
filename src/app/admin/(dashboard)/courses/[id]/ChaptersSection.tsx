"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { createChapter, deleteChapter, updateChapterTitle } from "./chapters/actions";
import { createLesson, deleteLesson } from "./lessons/actions";
import { reorderChapters } from "../actions";
import { reorderLessons } from "./chapters/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Lesson = { id: string; title: string };
type Quiz = { id: string; title: string };
type Chapter = { id: string; title: string; lessons: Lesson[]; quizzes: Quiz[] };

export default function ChaptersSection({
  courseId,
  initialChapters,
}: {
  courseId: string;
  initialChapters: Chapter[];
}) {
  const [chapters, setChapters] = useState(initialChapters);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleChapterDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setChapters((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      startTransition(() => {
        reorderChapters(
          courseId,
          next.map((c) => c.id),
        );
      });
      return next;
    });
  }

  async function handleAddChapter() {
    if (!newChapterTitle.trim()) return;
    const title = newChapterTitle.trim();
    setNewChapterTitle("");
    const chapter = await createChapter(courseId, title);
    setChapters((prev) => [...prev, { id: chapter.id, title, lessons: [], quizzes: [] }]);
    toast.success("Chapter added.");
  }

  async function handleDeleteChapter(chapterId: string) {
    if (!confirm("Delete this chapter and all its lessons?")) return;
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    await deleteChapter(courseId, chapterId);
    toast.success("Chapter deleted.");
  }

  function updateChapterLessons(chapterId: string, lessons: Lesson[]) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, lessons } : c)));
  }

  async function handleRenameChapter(chapterId: string, currentTitle: string) {
    const title = prompt("Chapter title", currentTitle);
    if (!title || !title.trim() || title === currentTitle) return;
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, title } : c)));
    await updateChapterTitle(courseId, chapterId, title);
  }

  return (
    <div className="space-y-4">
      <DndContext
        id="chapters-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleChapterDragEnd}
      >
        <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {chapters.map((chapter) => (
              <ChapterRow
                key={chapter.id}
                courseId={courseId}
                chapter={chapter}
                onDelete={() => handleDeleteChapter(chapter.id)}
                onRename={() => handleRenameChapter(chapter.id, chapter.title)}
                onLessonsChange={(lessons) => updateChapterLessons(chapter.id, lessons)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Input
          value={newChapterTitle}
          onChange={(e) => setNewChapterTitle(e.target.value)}
          placeholder="New chapter title"
          className="flex-1"
        />
        <Button onClick={handleAddChapter}>Add Chapter</Button>
      </div>
    </div>
  );
}

function ChapterRow({
  courseId,
  chapter,
  onDelete,
  onRename,
  onLessonsChange,
}: {
  courseId: string;
  chapter: Chapter;
  onDelete: () => void;
  onRename: () => void;
  onLessonsChange: (lessons: Lesson[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: chapter.id,
  });
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const style = { transform: CSS.Transform.toString(transform), transition };

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapter.lessons.findIndex((l) => l.id === active.id);
    const newIndex = chapter.lessons.findIndex((l) => l.id === over.id);
    const next = arrayMove(chapter.lessons, oldIndex, newIndex);
    onLessonsChange(next);
    startTransition(() => {
      reorderLessons(
        courseId,
        chapter.id,
        next.map((l) => l.id),
      );
    });
  }

  async function handleAddLesson() {
    if (!newLessonTitle.trim()) return;
    const title = newLessonTitle.trim();
    setNewLessonTitle("");
    const lesson = await createLesson(courseId, chapter.id, title);
    onLessonsChange([...chapter.lessons, { id: lesson.id, title: lesson.title }]);
    toast.success("Lesson added.");
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    onLessonsChange(chapter.lessons.filter((l) => l.id !== lessonId));
    await deleteLesson(courseId, chapter.id, lessonId);
    toast.success("Lesson deleted.");
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground"
            aria-label="Drag to reorder chapter"
          >
            ⠿
          </button>
          <button onClick={onRename} className="font-medium text-foreground hover:underline">
            {chapter.title}
          </button>
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>

      <div className="px-4 py-3">
        <DndContext
          id={`lessons-dnd-${chapter.id}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleLessonDragEnd}
        >
          <SortableContext
            items={chapter.lessons.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {chapter.lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  courseId={courseId}
                  lesson={lesson}
                  onDelete={() => handleDeleteLesson(lesson.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {chapter.quizzes.length > 0 && (
          <ul className="mt-2 space-y-1">
            {chapter.quizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/admin/courses/${courseId}/quizzes/${quiz.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Quiz: {quiz.title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex gap-2">
          <Input
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
            placeholder="New lesson title"
            className="flex-1"
          />
          <Button variant="outline" onClick={handleAddLesson}>
            Add Lesson
          </Button>
          <Button variant="outline" asChild>
            <Link
              href={{
                pathname: `/admin/courses/${courseId}/quizzes/new`,
                query: { chapterId: chapter.id },
              }}
            >
              Add Quiz
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LessonRow({
  courseId,
  lesson,
  onDelete,
}: {
  courseId: string;
  lesson: Lesson;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: lesson.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-md border px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder lesson"
        >
          ⠿
        </button>
        <Link
          href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
          className="text-sm text-foreground hover:underline"
        >
          {lesson.title}
        </Link>
      </div>
      <Button variant="destructive" size="xs" onClick={onDelete}>
        Delete
      </Button>
    </li>
  );
}

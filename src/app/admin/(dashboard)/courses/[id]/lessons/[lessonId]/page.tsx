import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import LessonForm from "./LessonForm";
import LessonFilesSection from "./LessonFilesSection";

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  await requireAdmin();
  const { id, lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { files: true },
  });

  if (!lesson) notFound();

  // Existing audio uploads are stored as a private storage path, not a public URL —
  // resolve a signed preview link so the admin can hear what's already saved.
  let audioPreviewUrl: string | null = null;
  if (lesson.lessonType === "AUDIO" && lesson.videoUrl && !/^https?:\/\//i.test(lesson.videoUrl)) {
    const supabase = createAdminClient();
    const { data } = await supabase.storage
      .from("lesson-files")
      .createSignedUrl(lesson.videoUrl, 600);
    audioPreviewUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{lesson.title}</h2>

      <LessonForm
        courseId={id}
        chapterId={lesson.chapterId}
        lessonId={lesson.id}
        title={lesson.title}
        lessonType={lesson.lessonType}
        videoUrl={lesson.videoUrl ?? ""}
        captionUrl={lesson.captionUrl ?? ""}
        textContent={lesson.textContent ?? ""}
        instructions={lesson.instructions ?? ""}
        audioPreviewUrl={audioPreviewUrl}
      />

      <LessonFilesSection
        courseId={id}
        lessonId={lesson.id}
        initialFiles={lesson.files.map((f) => ({ id: f.id, fileName: f.fileName }))}
      />
    </div>
  );
}

"use client";

import { useRef, useTransition } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import type { VideoSource } from "@/lib/video";
import { markLessonComplete } from "./actions";

export default function VideoLessonPlayer({
  courseId,
  lessonId,
  videoUrl,
  sourceType,
  completed,
}: {
  courseId: string;
  lessonId: string;
  videoUrl: string;
  sourceType: VideoSource;
  completed: boolean;
}) {
  const [, startTransition] = useTransition();
  const firedRef = useRef(completed);

  function handleComplete() {
    if (firedRef.current) return;
    firedRef.current = true;
    startTransition(() => {
      markLessonComplete(courseId, lessonId);
    });
  }

  return <VideoPlayer videoUrl={videoUrl} sourceType={sourceType} onComplete={handleComplete} />;
}

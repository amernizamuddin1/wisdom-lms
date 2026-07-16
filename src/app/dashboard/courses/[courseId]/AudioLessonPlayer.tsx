"use client";

import { useRef, useTransition } from "react";
import { markLessonComplete } from "./actions";

// Same "reasonable percentage" threshold as the video player.
const COMPLETE_THRESHOLD = 0.9;

export default function AudioLessonPlayer({
  courseId,
  lessonId,
  audioUrl,
  completed,
}: {
  courseId: string;
  lessonId: string;
  audioUrl: string;
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

  return (
    <audio
      controls
      className="w-full"
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        if (el.duration > 0 && el.currentTime / el.duration >= COMPLETE_THRESHOLD) {
          handleComplete();
        }
      }}
      onEnded={handleComplete}
    >
      <source src={audioUrl} />
      Your browser does not support the audio element.
    </audio>
  );
}

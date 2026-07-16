"use client";

import { useActionState, useRef } from "react";
import { toast } from "sonner";
import { uploadLessonAudio, type UploadAudioState } from "../actions";
import { Button } from "@/components/ui/button";

export default function AudioUploadSection({
  courseId,
  lessonId,
  onUploaded,
}: {
  courseId: string;
  lessonId: string;
  onUploaded: (path: string, previewUrl?: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boundAction = uploadLessonAudio.bind(null, courseId, lessonId);

  const [state, formAction, pending] = useActionState(
    async (prevState: UploadAudioState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result.path) {
        onUploaded(result.path, result.previewUrl);
        toast.success("Audio uploaded.");
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    {} as UploadAudioState,
  );

  // Not a native <form> — this section renders inside LessonForm's own <form>,
  // and forms can't nest in valid HTML.
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          accept="audio/*"
          className="cursor-pointer text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            const file = fileInputRef.current?.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append("file", file);
            formAction(formData);
          }}
        >
          {pending ? "Uploading..." : "Upload audio file"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.previewUrl && (
        <audio controls src={state.previewUrl} className="w-full">
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}

"use client";

import { useActionState, useMemo, useState } from "react";
import { updateLesson, type ActionState } from "../actions";
import { detectVideoSource } from "@/lib/video";
import type { LessonType } from "@/generated/prisma/client";
import RichTextEditor from "./RichTextEditor";
import AudioUploadSection from "./AudioUploadSection";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  VIDEO: "Video",
  AUDIO: "Audio",
  TEXT: "Text (reading material)",
};

export default function LessonForm({
  courseId,
  chapterId,
  lessonId,
  title,
  lessonType,
  videoUrl,
  captionUrl,
  textContent,
  instructions,
  audioPreviewUrl,
}: {
  courseId: string;
  chapterId: string;
  lessonId: string;
  title: string;
  lessonType: LessonType;
  videoUrl: string;
  captionUrl: string;
  textContent: string;
  instructions: string;
  audioPreviewUrl: string | null;
}) {
  const action = updateLesson.bind(null, courseId, chapterId, lessonId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Lesson saved.");

  const [type, setType] = useState<LessonType>(lessonType);
  const [url, setUrl] = useState(videoUrl);
  const [audioPreview, setAudioPreview] = useState(audioPreviewUrl);

  const detected = useMemo(() => detectVideoSource(url), [url]);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={title} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lessonType">Lesson type</Label>
              <Select
                name="lessonType"
                value={type}
                onValueChange={(value) => {
                  const nextType = value as LessonType;
                  if (nextType !== type) {
                    setUrl("");
                    setAudioPreview(null);
                  }
                  setType(nextType);
                }}
              >
                <SelectTrigger id="lessonType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "VIDEO" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="videoUrl">Video URL (YouTube or Vimeo)</Label>
                <Input
                  id="videoUrl"
                  name="videoUrl"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                />
                {url.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {detected
                      ? `Detected: ${detected}`
                      : "Source not recognized — supported: YouTube, Vimeo."}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="captionUrl">Caption track URL (optional)</Label>
                <Input
                  id="captionUrl"
                  name="captionUrl"
                  defaultValue={captionUrl}
                  placeholder="Captions are uploaded directly on YouTube/Vimeo — paste a reference link here if useful"
                />
              </div>
            </div>
          )}

          {type === "AUDIO" && (
            <div className="space-y-1.5">
              <Label htmlFor="videoUrl">Audio URL</Label>
              <Input
                id="videoUrl"
                name="videoUrl"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... or upload a file below"
              />
              {audioPreview && (
                <audio controls src={audioPreview} className="mt-2 w-full">
                  Your browser does not support the audio element.
                </audio>
              )}
              <AudioUploadSection
                courseId={courseId}
                lessonId={lessonId}
                onUploaded={(path, previewUrl) => {
                  setUrl(path);
                  setAudioPreview(previewUrl ?? null);
                }}
              />
            </div>
          )}

          {type === "TEXT" && (
            <div className="space-y-1.5">
              <Label>Reading material</Label>
              <RichTextEditor name="textContent" defaultValue={textContent} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="instructions">Instructions / notes</Label>
            <Textarea
              id="instructions"
              name="instructions"
              defaultValue={instructions}
              rows={6}
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Lesson"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

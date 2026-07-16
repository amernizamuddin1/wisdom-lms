"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { uploadLessonFile, deleteLessonFile, type UploadFileState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LessonFile = { id: string; fileName: string };

export default function LessonFilesSection({
  courseId,
  lessonId,
  initialFiles,
}: {
  courseId: string;
  lessonId: string;
  initialFiles: LessonFile[];
}) {
  const [files, setFiles] = useState(initialFiles);
  const boundAction = uploadLessonFile.bind(null, courseId, lessonId);

  const [state, formAction, pending] = useActionState(
    async (prevState: UploadFileState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result.file) {
        setFiles((prev) => [...prev, result.file!]);
        toast.success("File uploaded.");
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    {} as UploadFileState,
  );

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this file?")) return;
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    await deleteLessonFile(courseId, lessonId, fileId);
    toast.success("File removed.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Downloadable Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        ) : (
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{file.fileName}</span>
                <Button variant="destructive" size="xs" onClick={() => handleDelete(file.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form action={formAction} className="flex items-center gap-3">
          <input
            type="file"
            name="file"
            required
            className="cursor-pointer text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Uploading..." : "Upload"}
          </Button>
        </form>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DiscussionEditor from "@/components/community/DiscussionEditor";
import { createThreadAction } from "../actions";

type CourseThreadType = "DISCUSSION" | "QUESTION";

export default function NewCourseThreadForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [threadType, setThreadType] = useState<CourseThreadType>("DISCUSSION");
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const bodyHtml = String(formData.get("bodyHtml") ?? "");
    startTransition(async () => {
      const result = await createThreadAction({ courseId, title, bodyHtml, threadType });
      if (result.error) {
        toast.error(result.error);
      } else if (result.threadId) {
        toast.success("Discussion posted.");
        router.push(`/dashboard/courses/${courseId}/discussion/${result.threadId}`);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's your question or topic?"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={threadType} onValueChange={(v) => setThreadType(v as CourseThreadType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DISCUSSION">Discussion</SelectItem>
            <SelectItem value="QUESTION">Question</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Body</Label>
        <DiscussionEditor name="bodyHtml" placeholder="Share the details..." />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Posting..." : "Post discussion"}
      </Button>
    </form>
  );
}

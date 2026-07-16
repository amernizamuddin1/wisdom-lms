"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DiscussionEditor from "@/components/community/DiscussionEditor";
import { createThreadAction } from "@/app/community/actions";
import type { ThreadType } from "@/lib/community/threads";

export type CategoryOption = { id: string; name: string };

export default function NewThreadForm({
  categories,
  canPostAnnouncement,
}: {
  categories: CategoryOption[];
  canPostAnnouncement: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [threadType, setThreadType] = useState<ThreadType>("DISCUSSION");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const bodyHtml = String(formData.get("bodyHtml") ?? "");
    startTransition(async () => {
      const result = await createThreadAction({
        title,
        bodyHtml,
        threadType,
        categoryId: categoryId === "none" ? null : categoryId,
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.threadId) {
        toast.success("Discussion posted.");
        router.push(`/community/${result.threadId}`);
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={threadType} onValueChange={(v) => setThreadType(v as ThreadType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DISCUSSION">Discussion</SelectItem>
              <SelectItem value="QUESTION">Question</SelectItem>
              {canPostAnnouncement && <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

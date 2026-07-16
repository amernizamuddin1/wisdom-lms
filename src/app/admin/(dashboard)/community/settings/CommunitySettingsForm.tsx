"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommunitySettings } from "@/generated/prisma/client";
import { saveCommunitySettings, type ActionState } from "./actions";

const initialState: ActionState = {};

const TOGGLES: { key: keyof CommunitySettings; label: string; description?: string }[] = [
  { key: "communityEnabled", label: "Community enabled", description: "Master switch for the entire community feature." },
  { key: "courseDiscussionsEnabled", label: "Course discussions enabled" },
  { key: "allowGlobalDiscussionCreation", label: "Allow global discussion creation" },
  { key: "allowCourseQuestions", label: "Allow course questions" },
  { key: "allowLikes", label: "Allow likes" },
  { key: "allowReporting", label: "Allow reporting" },
  { key: "allowImageUploads", label: "Allow image uploads" },
  { key: "allowPostEditing", label: "Allow post editing" },
  { key: "allowAnswerEditing", label: "Allow answer editing" },
  { key: "allowReplyEditing", label: "Allow reply editing" },
  { key: "autoFollowOnParticipation", label: "Auto-follow on participation" },
];

export default function CommunitySettingsForm({ settings }: { settings: CommunitySettings }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveCommunitySettings, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Community settings saved.");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-6 rounded-lg border bg-card p-5">
      <div className="space-y-3">
        {TOGGLES.map((toggle) => (
          <div key={toggle.key} className="flex items-start gap-2">
            <Checkbox
              id={toggle.key}
              name={toggle.key}
              defaultChecked={Boolean(settings[toggle.key])}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor={toggle.key} className="font-normal">
                {toggle.label}
              </Label>
              {toggle.description && <p className="text-xs text-muted-foreground">{toggle.description}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="maxImageSizeMb">Max image size (MB)</Label>
          <Input
            id="maxImageSizeMb"
            name="maxImageSizeMb"
            type="number"
            min={1}
            defaultValue={settings.maxImageSizeMb}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="allowedImageFormats">Allowed image formats</Label>
          <Input
            id="allowedImageFormats"
            name="allowedImageFormats"
            defaultValue={settings.allowedImageFormats.join(", ")}
            placeholder="jpg, jpeg, png, webp"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="defaultSortOrder">Default sort order</Label>
          <Select name="defaultSortOrder" defaultValue={settings.defaultSortOrder}>
            <SelectTrigger id="defaultSortOrder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LATEST">Latest</SelectItem>
              <SelectItem value="POPULAR">Popular</SelectItem>
              <SelectItem value="UNANSWERED">Unanswered</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Announcement creator role</Label>
          <p className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
            Admin only (fixed for v1)
          </p>
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}

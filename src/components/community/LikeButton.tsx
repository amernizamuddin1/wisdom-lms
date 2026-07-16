"use client";

import { useState, useTransition } from "react";
import { HeartIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCommunityActions } from "@/components/community/actions-context";
import type { ReactionEntityType } from "@/lib/community/reactions";

export default function LikeButton({
  entityType,
  entityId,
  threadId,
  initialLiked,
  initialCount,
  isSignedIn,
}: {
  entityType: ReactionEntityType;
  entityId: string;
  threadId: string;
  initialLiked: boolean;
  initialCount: number;
  isSignedIn: boolean;
}) {
  const { toggleReactionAction } = useCommunityActions();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!isSignedIn) {
      toast.info("Log in to like posts.");
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    startTransition(async () => {
      const result = await toggleReactionAction(entityType, entityId, threadId);
      if (result.error) {
        // Revert optimistic update on failure.
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handleClick}
      className={cn("gap-1.5", liked && "text-destructive")}
      aria-pressed={liked}
    >
      <HeartIcon className={cn("size-4", liked && "fill-current")} />
      {count > 0 ? count : ""}
    </Button>
  );
}

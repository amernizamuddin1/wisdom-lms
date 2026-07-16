"use client";

import { useState, useTransition } from "react";
import { BellIcon, BellOffIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCommunityActions } from "@/components/community/actions-context";

export default function FollowButton({
  threadId,
  initialFollowing,
  isSignedIn,
}: {
  threadId: string;
  initialFollowing: boolean;
  isSignedIn: boolean;
}) {
  const { toggleFollowAction } = useCommunityActions();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!isSignedIn) {
      toast.info("Log in to follow discussions.");
      return;
    }
    const next = !following;
    setFollowing(next);

    startTransition(async () => {
      const result = await toggleFollowAction(threadId);
      if (result.error) {
        setFollowing(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick} className="gap-1.5">
      {following ? <BellOffIcon className="size-4" /> : <BellIcon className="size-4" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

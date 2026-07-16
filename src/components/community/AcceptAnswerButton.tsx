"use client";

import { useTransition } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCommunityActions } from "@/components/community/actions-context";

export default function AcceptAnswerButton({
  threadId,
  answerId,
  isAccepted,
}: {
  threadId: string;
  answerId: string;
  isAccepted: boolean;
}) {
  const { acceptAnswerAction, unacceptAnswerAction } = useCommunityActions();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = isAccepted
        ? await unacceptAnswerAction(threadId, answerId)
        : await acceptAnswerAction(threadId, answerId);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant={isAccepted ? "success" : "outline"}
      size="sm"
      disabled={pending}
      onClick={handleClick}
      className="gap-1.5"
    >
      <CheckCircle2Icon className="size-4" />
      {isAccepted ? "Accepted" : "Accept answer"}
    </Button>
  );
}

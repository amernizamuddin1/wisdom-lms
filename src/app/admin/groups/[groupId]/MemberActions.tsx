"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setMemberStatus, removeFromGroup } from "./actions";
import { Button } from "@/components/ui/button";
import type { MembershipStatus } from "@/generated/prisma/client";

export default function MemberActions({
  groupId,
  userId,
  status,
}: {
  groupId: string;
  userId: string;
  status: MembershipStatus;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handlePauseToggle() {
    const nextStatus: MembershipStatus = status === "REMOVED" ? "ACTIVE" : "REMOVED";
    const verb = nextStatus === "REMOVED" ? "Pause" : "Reactivate";
    if (!confirm(`${verb} this person's access? They will ${nextStatus === "REMOVED" ? "no longer be able to log in" : "be able to log in again"}.`)) return;
    startTransition(async () => {
      const result = await setMemberStatus(groupId, userId, nextStatus);
      if (result?.error) toast.error(result.error);
      else toast.success(nextStatus === "REMOVED" ? "Access paused." : "Access reactivated.");
      router.refresh();
    });
  }

  function handleRemove() {
    if (!confirm("Remove this person from this institution? This does not delete their account or revoke course access — it only takes them off this roster.")) return;
    startTransition(async () => {
      const result = await removeFromGroup(groupId, userId);
      if (result?.error) toast.error(result.error);
      else toast.success("Removed from institution.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handlePauseToggle} disabled={pending}>
        {status === "REMOVED" ? "Reactivate" : "Pause"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleRemove} disabled={pending}>
        Remove
      </Button>
    </div>
  );
}

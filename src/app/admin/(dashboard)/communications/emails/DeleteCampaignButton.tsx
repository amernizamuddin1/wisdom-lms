"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteCampaign } from "./actions";
import { Button } from "@/components/ui/button";

export default function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this draft campaign? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteCampaign(campaignId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete campaign.");
      }
    });
  }

  return (
    <Button variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { duplicateCampaign } from "./actions";
import { Button } from "@/components/ui/button";

export default function DuplicateCampaignButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => duplicateCampaign(campaignId))}
    >
      {pending ? "Duplicating..." : "Duplicate"}
    </Button>
  );
}

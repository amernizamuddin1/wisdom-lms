"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { liftRestrictionAction } from "./actions";

export default function LiftRestrictionButton({ restrictionId }: { restrictionId: string }) {
  const [pending, startTransition] = useTransition();

  function handleLift() {
    if (!confirm("Lift this restriction? The user will be able to post again immediately.")) return;
    startTransition(async () => {
      const result = await liftRestrictionAction(restrictionId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Restriction lifted.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLift} disabled={pending}>
      {pending ? "Lifting..." : "Lift"}
    </Button>
  );
}

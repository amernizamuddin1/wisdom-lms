"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBundle } from "./actions";
import { Button } from "@/components/ui/button";

export default function BundleDeleteButton({ bundleId }: { bundleId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this bundle? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteBundle(bundleId);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
      Delete
    </Button>
  );
}

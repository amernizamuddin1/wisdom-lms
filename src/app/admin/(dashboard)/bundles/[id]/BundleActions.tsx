"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setBundleStatus, deleteBundle } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BundleActions({
  bundleId,
  status,
}: {
  bundleId: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(next: "DRAFT" | "ACTIVE" | "PAUSED") {
    startTransition(async () => {
      const result = await setBundleStatus(bundleId, next);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Bundle status set to ${next}.`);
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this bundle? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteBundle(bundleId);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge
        variant={status === "ACTIVE" ? "success" : status === "PAUSED" ? "secondary" : "outline"}
      >
        {status}
      </Badge>

      {status !== "ACTIVE" && (
        <Button variant="outline" size="sm" onClick={() => setStatus("ACTIVE")} disabled={pending}>
          Activate
        </Button>
      )}
      {status === "ACTIVE" && (
        <Button variant="outline" size="sm" onClick={() => setStatus("PAUSED")} disabled={pending}>
          Pause
        </Button>
      )}
      {status !== "DRAFT" && (
        <Button variant="outline" size="sm" onClick={() => setStatus("DRAFT")} disabled={pending}>
          Move to Draft
        </Button>
      )}
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
        Delete Bundle
      </Button>
    </div>
  );
}

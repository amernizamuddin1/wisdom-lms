"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { revokeGroupAdmin } from "./actions";
import { Button } from "@/components/ui/button";

export default function RevokeAdminButton({ groupId, userId }: { groupId: string; userId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleRevoke() {
    if (!confirm("Revoke this sub-admin's access to this institution?")) return;
    startTransition(async () => {
      const result = await revokeGroupAdmin(groupId, userId);
      if (result?.error) toast.error(result.error);
      else toast.success("Sub-admin access revoked.");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRevoke} disabled={pending}>
      Revoke
    </Button>
  );
}

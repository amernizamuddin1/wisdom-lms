"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteNotification } from "./actions";
import { Button } from "@/components/ui/button";

export default function DeleteNotificationButton({ notificationId }: { notificationId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this notification? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteNotification(notificationId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete notification.");
      }
    });
  }

  return (
    <Button variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}

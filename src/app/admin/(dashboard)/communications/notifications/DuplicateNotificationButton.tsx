"use client";

import { useTransition } from "react";
import { duplicateNotification } from "./actions";
import { Button } from "@/components/ui/button";

export default function DuplicateNotificationButton({ notificationId }: { notificationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => duplicateNotification(notificationId))}
    >
      {pending ? "Duplicating..." : "Duplicate"}
    </Button>
  );
}

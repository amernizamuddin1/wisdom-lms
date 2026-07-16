"use client";

import { useEffect, useRef } from "react";
import { createDraftNotification } from "../actions";

// Creating the draft is a mutation, so it must run from an effect/event
// after mount — never directly in a Server Component's render body, which
// Next.js disallows for revalidatePath/redirect and which prefetching could
// otherwise trigger unintentionally.
export default function NewNotificationTrigger() {
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    void createDraftNotification();
  }, []);

  return <p className="text-sm text-muted-foreground">Creating a new draft notification...</p>;
}

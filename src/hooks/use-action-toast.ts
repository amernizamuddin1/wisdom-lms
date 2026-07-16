"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ActionToastState = { error?: string; success?: boolean };

// Fires a toast whenever a useActionState result changes to an error or a
// success — one-line addition to any form already using the {error?, success?}
// action-state shape. Skips the very first render so mounting a form never
// fires a stale toast from its initial state.
export function useActionToast(state: ActionToastState, successMessage: string) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success(successMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

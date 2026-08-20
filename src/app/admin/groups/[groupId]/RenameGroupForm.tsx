"use client";

import { useActionState, useEffect, useState } from "react";
import { PencilIcon, XIcon } from "lucide-react";
import { renameGroup, type ActionState } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function RenameGroupForm({ groupId, name }: { groupId: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(renameGroup.bind(null, groupId), initialState);
  useActionToast(state, "Institution renamed.");

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Rename institution"
          onClick={() => setEditing(true)}
        >
          <PencilIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input name="name" defaultValue={name} required autoFocus className="h-9 max-w-xs text-2xl font-semibold" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Cancel" onClick={() => setEditing(false)}>
        <XIcon className="size-4" />
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

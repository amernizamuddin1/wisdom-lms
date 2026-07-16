"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { restrictUserAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export default function RestrictUserForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(restrictUserAction, initialState);
  const [restrictionType, setRestrictionType] = useState("TEMPORARY");

  useEffect(() => {
    if (state.success) {
      toast.success("User restricted.");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-card p-5">
      <h3 className="text-sm font-medium text-foreground">Restrict a user</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">User ID or email</Label>
          <Input id="identifier" name="identifier" placeholder="user@example.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="restrictionType">Type</Label>
          <Select name="restrictionType" value={restrictionType} onValueChange={setRestrictionType}>
            <SelectTrigger id="restrictionType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEMPORARY">Temporary</SelectItem>
              <SelectItem value="PERMANENT">Permanent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {restrictionType === "TEMPORARY" && (
          <div className="space-y-1.5">
            <Label htmlFor="expiresAt">Expires at</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" required />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" name="reason" rows={2} required />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Restricting..." : "Restrict user"}
      </Button>
    </form>
  );
}

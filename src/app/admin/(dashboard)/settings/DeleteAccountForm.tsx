"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { deleteUserAccount, type DeleteAccountState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: DeleteAccountState = {};

export default function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteUserAccount, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.error) {
      toast.error(state.error);
    } else if (state.result === "purged") {
      toast.success("Account fully deleted.");
      formRef.current?.reset();
    } else if (state.result === "anonymized") {
      toast.success("Personal data erased; financial/audit records retained per compliance requirements.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Permanently Delete an Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          For compliance requests (right-to-erasure). This deletes the person&apos;s entire
          account — not just their membership in this tenant, since accounts are global. If they
          have order/payment history or authored communications, those records are kept for
          financial/audit compliance and their personal data is scrubbed instead of the account
          being fully removed. This cannot be undone.
        </p>

        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="delete-email">Account email</Label>
            <Input id="delete-email" name="email" type="email" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delete-confirmation">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </Label>
            <Input id="delete-confirmation" name="confirmation" required autoComplete="off" />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Deleting..." : "Permanently Delete Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

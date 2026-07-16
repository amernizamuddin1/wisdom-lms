"use client";

import { useActionState, useEffect, useState } from "react";
import { saveRazorpaySettings, saveResendSettings, type SettingsActionState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: SettingsActionState = {};

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <Badge variant={configured ? "success" : "outline"}>
      {configured ? "Configured" : "Not set"}
    </Badge>
  );
}

export default function IntegrationSettingsForm({
  keyIdConfigured,
  keySecretConfigured,
  webhookSecretConfigured,
  resendApiKeyConfigured,
  resendSenderEmail,
  resendSenderName,
}: {
  keyIdConfigured: boolean;
  keySecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  resendApiKeyConfigured: boolean;
  resendSenderEmail: string | null;
  resendSenderName: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveRazorpaySettings, initialState);
  const [resendState, resendFormAction, resendPending] = useActionState(
    saveResendSettings,
    initialState,
  );
  useActionToast(state, "Razorpay settings saved.");
  useActionToast(resendState, "Resend settings saved.");
  const [webhookUrl, setWebhookUrl] = useState("/api/webhooks/razorpay");

  // window.location is only known client-side — avoid a hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebhookUrl(`${window.location.origin}/api/webhooks/razorpay`);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Razorpay</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keyId">Key ID</Label>
                  <StatusBadge configured={keyIdConfigured} />
                </div>
                <Input
                  id="keyId"
                  name="keyId"
                  placeholder={keyIdConfigured ? "Unchanged if left blank" : "rzp_test_..."}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keySecret">Key Secret</Label>
                  <StatusBadge configured={keySecretConfigured} />
                </div>
                <Input
                  id="keySecret"
                  name="keySecret"
                  type="password"
                  placeholder={keySecretConfigured ? "Unchanged if left blank" : "Enter key secret"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                <StatusBadge configured={webhookSecretConfigured} />
              </div>
              <Input
                id="webhookSecret"
                name="webhookSecret"
                type="password"
                placeholder={
                  webhookSecretConfigured ? "Unchanged if left blank" : "Enter webhook secret"
                }
              />
            </div>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}

            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Razorpay Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Paste this into your Razorpay Dashboard under Settings &rarr; Webhooks, subscribed to
            the <code className="font-mono text-xs">payment.captured</code> event.
          </p>
          <Input readOnly value={webhookUrl} onFocus={(e) => e.target.select()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resend (Email)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={resendFormAction} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="apiKey">API Key</Label>
                <StatusBadge configured={resendApiKeyConfigured} />
              </div>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder={resendApiKeyConfigured ? "Unchanged if left blank" : "re_..."}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="senderName">Sender Name</Label>
                <Input
                  id="senderName"
                  name="senderName"
                  defaultValue={resendSenderName ?? ""}
                  placeholder="e.g. WisdomQuant Communications"
                />
                <p className="text-xs text-muted-foreground">
                  Shown as the &ldquo;From&rdquo; name in recipients&apos; inboxes, alongside the
                  sender email below.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderEmail">Sender Email</Label>
                <Input
                  id="senderEmail"
                  name="senderEmail"
                  type="email"
                  defaultValue={resendSenderEmail ?? ""}
                  placeholder="noreply@yourdomain.com or onboarding@resend.dev"
                />
              </div>
            </div>

            {resendState.error && <p className="text-sm text-destructive">{resendState.error}</p>}

            <Button type="submit" disabled={resendPending}>
              {resendPending ? "Saving..." : "Save Resend Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

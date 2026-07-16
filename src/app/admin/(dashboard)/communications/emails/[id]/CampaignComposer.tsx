"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActionToast } from "@/hooks/use-action-toast";
import EmailRichEditor from "../../EmailRichEditor";
import AudienceFields, { type AudienceOption, type AudienceUser } from "../../AudienceFields";
import {
  saveCampaignDraft,
  sendCampaignNow,
  scheduleCampaign,
  sendTestEmailAction,
  previewCampaignRecipients,
  type ActionState,
} from "../actions";
import { wrapEmailHtml } from "@/lib/email-templates/layout";
import type { Branding } from "@/lib/branding";
import type { EmailCampaign } from "@/generated/prisma/client";

const initialState: ActionState = {};

export default function CampaignComposer({
  campaign,
  courses,
  bundles,
  users,
  branding,
}: {
  campaign: EmailCampaign;
  courses: AudienceOption[];
  bundles: AudienceOption[];
  users: AudienceUser[];
  branding: Branding;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isLocked = campaign.status === "SENT" || campaign.status === "SENDING";

  const [draftState, draftAction, draftPending] = useActionState(
    saveCampaignDraft.bind(null, campaign.id),
    initialState,
  );
  const [sendState, sendActionRaw, sendPending] = useActionState(
    sendCampaignNow.bind(null, campaign.id),
    initialState,
  );
  const [scheduleState, scheduleActionRaw, schedulePending] = useActionState(
    scheduleCampaign.bind(null, campaign.id),
    initialState,
  );
  const [testState, testAction, testPending] = useActionState(
    sendTestEmailAction.bind(null, campaign.id),
    initialState,
  );

  useActionToast(draftState, "Draft saved.");
  useActionToast(sendState, "Campaign sent.");
  useActionToast(scheduleState, "Campaign scheduled.");
  useActionToast(testState, "Test email sent.");

  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    if (sendState.success || scheduleState.success) {
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendState, scheduleState]);

  function buildPreviewHtml() {
    if (!formRef.current) return "";
    const fd = new FormData(formRef.current);
    const html = String(fd.get("htmlContent") ?? "");
    return wrapEmailHtml(html, branding);
  }

  function openPreview(mode: "desktop" | "mobile") {
    setPreviewHtml(buildPreviewHtml());
    setPreviewMode(mode);
  }

  async function handleAudiencePreview() {
    if (!formRef.current) return [];
    const fd = new FormData(formRef.current);
    return previewCampaignRecipients(fd);
  }

  return (
    <form ref={formRef} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
        {campaign.sentAt && (
          <p className="text-sm text-muted-foreground">Sent {formatDateTime(campaign.sentAt)}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="internalName">Campaign name (internal)</Label>
              <Input id="internalName" name="internalName" defaultValue={campaign.internalName} required disabled={isLocked} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject line</Label>
              <Input id="subject" name="subject" defaultValue={campaign.subject} required disabled={isLocked} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preheader">Preview text / preheader</Label>
            <Input id="preheader" name="preheader" defaultValue={campaign.preheader ?? ""} disabled={isLocked} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="senderName">Sender name</Label>
              <Input id="senderName" name="senderName" defaultValue={campaign.senderName ?? ""} disabled={isLocked} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fromEmail">From email</Label>
              <Input id="fromEmail" name="fromEmail" type="email" defaultValue={campaign.fromEmail ?? ""} placeholder="Uses Resend default if blank" disabled={isLocked} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="replyTo">Reply-to (optional)</Label>
              <Input id="replyTo" name="replyTo" type="email" defaultValue={campaign.replyTo ?? ""} disabled={isLocked} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Body</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLocked ? (
            <div
              className="prose prose-sm max-w-none rounded-md border p-3"
              dangerouslySetInnerHTML={{ __html: campaign.htmlContent }}
            />
          ) : (
            <EmailRichEditor name="htmlContent" defaultValue={campaign.htmlContent} primaryColor={branding.primaryColor} />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openPreview("desktop")}>
              Preview Desktop
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => openPreview("mobile")}>
              Preview Mobile
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewMode && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{previewMode === "desktop" ? "Desktop Preview" : "Mobile Preview"}</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewMode(null)}>Close</Button>
          </CardHeader>
          <CardContent>
            <div className={previewMode === "mobile" ? "mx-auto max-w-[390px] overflow-hidden rounded-lg border" : "overflow-hidden rounded-lg border"}>
              <iframe title="Email preview" srcDoc={previewHtml} className="h-[600px] w-full bg-white" />
            </div>
          </CardContent>
        </Card>
      )}

      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <AudienceFields
              courses={courses}
              bundles={bundles}
              users={users}
              defaults={{
                audienceType: campaign.audienceType,
                selectedCourseIds: campaign.selectedCourseIds,
                selectedBundleIds: campaign.selectedBundleIds,
                manuallySelectedUserIds: campaign.manuallySelectedUserIds,
                excludedUserIds: campaign.excludedUserIds,
              }}
              onPreview={handleAudiencePreview}
            />
          </CardContent>
        </Card>
      )}

      {isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Send Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recipient count: <span className="font-medium text-foreground">{campaign.recipientCount}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Send a Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="testEmails">Test email address(es)</Label>
            <Textarea id="testEmails" name="testEmails" rows={2} placeholder="you@example.com, teammate@example.com" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={testPending}
            onClick={() => {
              if (!formRef.current) return;
              startTransition(() => testAction(new FormData(formRef.current!)));
            }}
          >
            {testPending ? "Sending test..." : "Send Test Email"}
          </Button>
        </CardContent>
      </Card>

      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">Send at</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={schedulePending || !scheduledAt}
                onClick={() => {
                  if (!formRef.current) return;
                  const fd = new FormData(formRef.current);
                  fd.set("scheduledAt", scheduledAt);
                  startTransition(() => scheduleActionRaw(fd));
                }}
              >
                {schedulePending ? "Scheduling..." : "Schedule Campaign"}
              </Button>
            </div>
            {(draftState.error || sendState.error || scheduleState.error || testState.error) && (
              <p className="text-sm text-destructive">
                {draftState.error || sendState.error || scheduleState.error || testState.error}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!isLocked && (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={draftPending}
            onClick={() => {
              if (!formRef.current) return;
              startTransition(() => draftAction(new FormData(formRef.current!)));
            }}
          >
            {draftPending ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            disabled={sendPending}
            onClick={() => {
              if (!formRef.current) return;
              if (!confirm("Send this campaign now? This cannot be undone.")) return;
              startTransition(() => sendActionRaw(new FormData(formRef.current!)));
            }}
          >
            {sendPending ? "Sending..." : "Send Now"}
          </Button>
        </div>
      )}
    </form>
  );
}

function statusVariant(status: string): "success" | "secondary" | "outline" | "destructive" {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "SCHEDULED" || status === "SENDING") return "secondary";
  return "outline";
}

// Pinned locale/timezone so server (SSR) and client (hydration) render the
// exact same string — the browser's default locale/timezone can differ from
// the server's, which otherwise causes a hydration mismatch.
function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

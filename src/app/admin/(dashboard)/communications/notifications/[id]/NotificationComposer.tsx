"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionToast } from "@/hooks/use-action-toast";
import EmailRichEditor from "../../EmailRichEditor";
import AudienceFields, { type AudienceOption, type AudienceUser } from "../../AudienceFields";
import {
  saveNotificationDraft,
  publishNotification,
  scheduleNotification,
  previewNotificationRecipients,
  type ActionState,
} from "../actions";
import type { Notification } from "@/generated/prisma/client";

const initialState: ActionState = {};

function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function NotificationComposer({
  notification,
  courses,
  bundles,
  users,
  primaryColor,
}: {
  notification: Notification;
  courses: AudienceOption[];
  bundles: AudienceOption[];
  users: AudienceUser[];
  primaryColor: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isLocked = notification.status === "PUBLISHED";

  const [draftState, draftActionRaw] = useActionState(saveNotificationDraft.bind(null, notification.id), initialState);
  const [publishState, publishActionRaw] = useActionState(publishNotification.bind(null, notification.id), initialState);
  const [scheduleState, scheduleActionRaw] = useActionState(scheduleNotification.bind(null, notification.id), initialState);

  useActionToast(draftState, "Draft saved.");
  useActionToast(publishState, "Notification published.");
  useActionToast(scheduleState, "Notification scheduled.");

  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(notification.scheduledAt));
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(notification.expiresAt));

  useEffect(() => {
    if (publishState.success || scheduleState.success) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishState, scheduleState]);

  async function handleAudiencePreview() {
    if (!formRef.current) return [];
    return previewNotificationRecipients(new FormData(formRef.current));
  }

  return (
    <form ref={formRef} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={statusVariant(notification.status)}>{notification.status}</Badge>
        {notification.publishedAt && (
          <p className="text-sm text-muted-foreground">
            Published {formatDateTime(notification.publishedAt)}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="internalName">Internal name</Label>
              <Input id="internalName" name="internalName" defaultValue={notification.internalName} required disabled={isLocked} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={notification.title} required disabled={isLocked} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue={notification.priority} disabled={isLocked}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctaLabel">CTA label (optional)</Label>
              <Input id="ctaLabel" name="ctaLabel" defaultValue={notification.ctaLabel ?? ""} disabled={isLocked} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctaUrl">CTA destination URL (optional)</Label>
              <Input id="ctaUrl" name="ctaUrl" defaultValue={notification.ctaUrl ?? ""} placeholder="/courses/..." disabled={isLocked} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent>
          {isLocked ? (
            <div className="prose prose-sm max-w-none rounded-md border p-3" dangerouslySetInnerHTML={{ __html: notification.richContent }} />
          ) : (
            <EmailRichEditor name="richContent" defaultValue={notification.richContent} primaryColor={primaryColor} />
          )}
        </CardContent>
      </Card>

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
                audienceType: notification.audienceType,
                selectedCourseIds: notification.selectedCourseIds,
                selectedBundleIds: notification.selectedBundleIds,
                manuallySelectedUserIds: notification.manuallySelectedUserIds,
                excludedUserIds: notification.excludedUserIds,
              }}
              onPreview={handleAudiencePreview}
            />
          </CardContent>
        </Card>
      )}

      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAtInput">Publish at (optional — leave blank to publish immediately)</Label>
                <Input
                  id="scheduledAtInput"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresAtInput">Expiry date (optional)</Label>
                <Input
                  id="expiresAtInput"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            {(draftState.error || publishState.error || scheduleState.error) && (
              <p className="text-sm text-destructive">
                {draftState.error || publishState.error || scheduleState.error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!formRef.current) return;
                  const fd = new FormData(formRef.current);
                  fd.set("scheduledAt", scheduledAt);
                  fd.set("expiresAt", expiresAt);
                  startTransition(() => draftActionRaw(fd));
                }}
              >
                Save as Draft
              </Button>

              {scheduledAt ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (!formRef.current) return;
                    const fd = new FormData(formRef.current);
                    fd.set("scheduledAt", scheduledAt);
                    fd.set("expiresAt", expiresAt);
                    startTransition(() => scheduleActionRaw(fd));
                  }}
                >
                  Schedule Notification
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    if (!formRef.current) return;
                    if (!confirm("Publish this notification now?")) return;
                    const fd = new FormData(formRef.current);
                    fd.set("expiresAt", expiresAt);
                    startTransition(() => publishActionRaw(fd));
                  }}
                >
                  Publish Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This notification has been published and can no longer be edited.
            </p>
          </CardContent>
        </Card>
      )}
    </form>
  );
}

function statusVariant(status: string): "success" | "secondary" | "outline" | "destructive" {
  if (status === "PUBLISHED") return "success";
  if (status === "SCHEDULED") return "secondary";
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

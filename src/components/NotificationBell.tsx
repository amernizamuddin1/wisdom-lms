"use client";

import { useState, useTransition } from "react";
import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  clearReadNotificationsAction,
} from "@/app/notifications/actions";

export interface BellNotification {
  recipientId: string;
  id: string;
  title: string;
  richContent: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  priority: string;
  readAt: Date | null;
  deliveredAt: Date;
}

export default function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: BellNotification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const visibleNotifications = notifications.filter((n) => !clearedIds.has(n.recipientId));
  const effectiveUnread = Math.max(0, unreadCount - localReadIds.size);
  const hasReadToClear = visibleNotifications.some(
    (n) => Boolean(n.readAt) || localReadIds.has(n.recipientId),
  );

  function handleOpen(next: boolean) {
    setOpen(next);
  }

  function handleMarkRead(recipientId: string, notificationId: string) {
    if (localReadIds.has(recipientId)) return;
    setLocalReadIds((prev) => new Set(prev).add(recipientId));
    startTransition(() => markNotificationReadAction(notificationId));
  }

  function handleMarkAllRead() {
    setLocalReadIds(new Set(notifications.map((n) => n.recipientId)));
    startTransition(() => markAllNotificationsReadAction());
  }

  function handleClearRead() {
    if (!confirm("Clear all read notifications? This can't be undone.")) return;
    const readIds = visibleNotifications
      .filter((n) => Boolean(n.readAt) || localReadIds.has(n.recipientId))
      .map((n) => n.recipientId);
    setClearedIds((prev) => new Set([...prev, ...readIds]));
    startTransition(() => clearReadNotificationsAction());
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Notifications${effectiveUnread > 0 ? ` (${effectiveUnread} unread)` : ""}`}
        className="relative"
        onClick={() => handleOpen(!open)}
      >
        <BellIcon className="size-4" />
        {effectiveUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {effectiveUnread > 9 ? "9+" : effectiveUnread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border bg-popover text-popover-foreground shadow-lg sm:w-96">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-3">
                {hasReadToClear && (
                  <button
                    type="button"
                    onClick={handleClearRead}
                    disabled={pending}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Clear read
                  </button>
                )}
                {visibleNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={pending}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {visibleNotifications.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
              )}
              {visibleNotifications.map((n) => {
                const isRead = Boolean(n.readAt) || localReadIds.has(n.recipientId);
                return (
                  <div
                    key={n.recipientId}
                    className={`space-y-1.5 border-b px-4 py-3 last:border-b-0 ${isRead ? "" : "bg-surface-brand-subtle"}`}
                    onMouseEnter={() => handleMarkRead(n.recipientId, n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {!isRead && <Badge variant="secondary" className="shrink-0">New</Badge>}
                    </div>
                    {n.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.imageUrl} alt="" className="max-h-32 w-full rounded-md object-cover" />
                    )}
                    <div
                      className="prose prose-sm max-w-none text-xs text-muted-foreground [&_p]:my-1"
                      dangerouslySetInnerHTML={{ __html: n.richContent }}
                    />
                    {n.ctaLabel && n.ctaUrl && (
                      <a
                        href={n.ctaUrl}
                        className="inline-block text-xs font-medium text-primary hover:underline"
                      >
                        {n.ctaLabel} &rarr;
                      </a>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(n.deliveredAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

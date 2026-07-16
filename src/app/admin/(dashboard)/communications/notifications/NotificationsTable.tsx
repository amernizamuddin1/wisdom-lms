"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bulkDeleteNotifications } from "./actions";

export interface NotificationRow {
  id: string;
  internalName: string;
  title: string;
  status: string;
  isExpired: boolean;
  recipientCount: number;
  createdByName: string;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  expiresAt: Date | null;
}

function statusVariant(status: string): "success" | "secondary" | "outline" {
  if (status === "PUBLISHED") return "success";
  if (status === "SCHEDULED") return "secondary";
  return "outline";
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export default function NotificationsTable({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const deletableIds = useMemo(
    () => notifications.filter((n) => n.status !== "PUBLISHED").map((n) => n.id),
    [notifications],
  );
  const allDeletableSelected = deletableIds.length > 0 && deletableIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allDeletableSelected ? new Set() : new Set(deletableIds));
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected notification${selected.size === 1 ? "" : "s"}?`)) return;

    startTransition(async () => {
      const result = await bulkDeleteNotifications(Array.from(selected));
      setSelected(new Set());
      if (result.deletedCount > 0) {
        toast.success(
          `Deleted ${result.deletedCount} notification${result.deletedCount === 1 ? "" : "s"}.` +
            (result.skippedCount > 0 ? ` ${result.skippedCount} published notification(s) were skipped.` : ""),
        );
      } else if (result.skippedCount > 0) {
        toast.error("Published notifications can't be deleted.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
          <p className="text-sm text-foreground">
            {selected.size} selected
          </p>
          <Button variant="destructive" size="sm" disabled={pending} onClick={handleDeleteSelected}>
            {pending ? "Deleting..." : "Delete Selected"}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  className="size-4 rounded border-input"
                  checked={allDeletableSelected}
                  onChange={toggleAll}
                  disabled={deletableIds.length === 0}
                />
              </th>
              <th className="px-4 py-3 font-medium">Notification</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 font-medium">Published / Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {notifications.map((n) => {
              const isDeletable = n.status !== "PUBLISHED";
              return (
                <tr key={n.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${n.internalName}`}
                      className="size-4 rounded border-input"
                      checked={selected.has(n.id)}
                      onChange={() => toggleOne(n.id)}
                      disabled={!isDeletable}
                      title={isDeletable ? undefined : "Published notifications can't be deleted"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/communications/notifications/${n.id}`} className="font-medium text-foreground hover:underline">
                      {n.internalName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{n.title || "No title yet"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={n.isExpired ? "outline" : statusVariant(n.status)}>
                      {n.isExpired ? "EXPIRED" : n.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{n.recipientCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.createdByName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {n.publishedAt
                      ? formatDateTime(n.publishedAt)
                      : n.scheduledAt
                        ? `Scheduled: ${formatDateTime(n.scheduledAt)}`
                        : "—"}
                    {n.expiresAt && <div className="text-xs">Expires {formatDateTime(n.expiresAt)}</div>}
                  </td>
                </tr>
              );
            })}
            {notifications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No notifications match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

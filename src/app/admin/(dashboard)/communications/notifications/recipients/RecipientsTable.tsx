"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteNotificationRecipient, bulkDeleteNotificationRecipients } from "./actions";

export interface RecipientRow {
  id: string;
  notificationTitle: string;
  userName: string;
  userEmail: string;
  deliveredAt: Date;
  readAt: Date | null;
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export default function RecipientsTable({ recipients }: { recipients: RecipientRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = recipients.length > 0 && recipients.every((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(recipients.map((r) => r.id)));
  }

  function handleDeleteOne(id: string) {
    if (!confirm("Delete this delivered notification record? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteNotificationRecipient(id);
        toast.success("Deleted.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete record.");
      }
      router.refresh();
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected record${selected.size === 1 ? "" : "s"}?`)) return;

    startTransition(async () => {
      const result = await bulkDeleteNotificationRecipients(Array.from(selected));
      setSelected(new Set());
      if (result.deletedCount > 0) {
        toast.success(`Deleted ${result.deletedCount} record${result.deletedCount === 1 ? "" : "s"}.`);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
          <p className="text-sm text-foreground">{selected.size} selected</p>
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
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={recipients.length === 0}
                />
              </th>
              <th className="px-4 py-3 font-medium">Notification</th>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recipients.map((r) => (
              <tr key={r.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.notificationTitle}`}
                    className="size-4 rounded border-input"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{r.notificationTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.userName}
                  <div className="text-xs">{r.userEmail}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={r.readAt ? "outline" : "secondary"}>{r.readAt ? "Read" : "Unread"}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.deliveredAt)}</td>
                <td className="px-4 py-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleDeleteOne(r.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {recipients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No delivered notifications match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

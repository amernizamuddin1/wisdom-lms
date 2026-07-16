import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchNotifications, type NotificationListParams } from "./queries";
import NotificationsTable from "./NotificationsTable";
import NotificationsSubTabs from "./NotificationsSubTabs";

export default async function NotificationsListPage({
  searchParams,
}: {
  searchParams: Promise<NotificationListParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const notifications = await fetchNotifications(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">Send in-app notifications to learners.</p>
        </div>
        <Button asChild>
          <Link href="/admin/communications/notifications/new">New Notification</Link>
        </Button>
      </div>

      <NotificationsSubTabs />

      <form method="get" className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={params.q} placeholder="Name or title..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={params.status ?? "any"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="PUBLISHED">Active</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply Filters
          </button>
        </div>
      </form>

      <NotificationsTable
        notifications={notifications.map((n) => ({
          id: n.id,
          internalName: n.internalName,
          title: n.title,
          status: n.status,
          isExpired: n.isExpired,
          recipientCount: n._count.recipients,
          createdByName: n.createdBy.name,
          publishedAt: n.publishedAt,
          scheduledAt: n.scheduledAt,
          expiresAt: n.expiresAt,
        }))}
      />
    </div>
  );
}

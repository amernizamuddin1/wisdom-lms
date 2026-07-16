import { requireAdmin } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchNotificationRecipients, type RecipientListParams } from "./queries";
import NotificationsSubTabs from "../NotificationsSubTabs";
import RecipientsTable from "./RecipientsTable";

export default async function NotificationDeliveryLogPage({
  searchParams,
}: {
  searchParams: Promise<RecipientListParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const recipients = await fetchNotificationRecipients(params);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Delivered notification records, per recipient. Clean up old or read entries here.
        </p>
      </div>

      <NotificationsSubTabs />

      <form method="get" className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="readStatus">Read status</Label>
          <Select name="readStatus" defaultValue={params.readStatus ?? "any"}>
            <SelectTrigger id="readStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="olderThan">Older than</Label>
          <Select name="olderThan" defaultValue={params.olderThan ?? "any"}>
            <SelectTrigger id="olderThan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">Delivered from</Label>
          <Input id="from" name="from" type="date" defaultValue={params.from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Delivered to</Label>
          <Input id="to" name="to" type="date" defaultValue={params.to} />
        </div>
        <div className="flex items-end lg:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply Filters
          </button>
        </div>
      </form>

      <RecipientsTable recipients={recipients} />
    </div>
  );
}

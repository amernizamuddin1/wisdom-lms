import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchEmailCampaigns, type EmailCampaignListParams } from "./queries";

export default async function EmailCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<EmailCampaignListParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const campaigns = await fetchEmailCampaigns(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Emails</h2>
          <p className="text-sm text-muted-foreground">Compose and send HTML email campaigns.</p>
        </div>
        <Button asChild>
          <Link href="/admin/communications/emails/new">New Email</Link>
        </Button>
      </div>

      <form method="get" className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={params.q} placeholder="Campaign name or subject..." />
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
              <SelectItem value="SENDING">Sending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
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

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 font-medium">Scheduled / Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/communications/emails/${c.id}`} className="font-medium text-foreground hover:underline">
                    {c.internalName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{c.subject || "No subject yet"}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.recipientCount || c._count.recipients}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.createdBy.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.sentAt
                    ? c.sentAt.toLocaleString()
                    : c.scheduledAt
                      ? `Scheduled: ${c.scheduledAt.toLocaleString()}`
                      : "—"}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No campaigns match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusVariant(status: string): "success" | "secondary" | "outline" | "destructive" {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "SCHEDULED" || status === "SENDING") return "secondary";
  return "outline";
}

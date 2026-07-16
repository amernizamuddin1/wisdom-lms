import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import CampaignComposer from "./CampaignComposer";
import DuplicateCampaignButton from "../DuplicateCampaignButton";
import DeleteCampaignButton from "../DeleteCampaignButton";

export default async function EmailCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [campaign, courses, bundles, users, branding] = await Promise.all([
    prisma.emailCampaign.findUnique({ where: { id } }),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.courseBundle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    getBranding(),
  ]);

  if (!campaign) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{campaign.internalName}</h1>
          <p className="text-sm text-muted-foreground">Email campaign</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/communications/emails">Back to Emails</Link>
          </Button>
          <DuplicateCampaignButton campaignId={campaign.id} />
          {campaign.status !== "SENT" && campaign.status !== "SENDING" && (
            <DeleteCampaignButton campaignId={campaign.id} />
          )}
        </div>
      </div>

      <CampaignComposer
        campaign={campaign}
        courses={courses.map((c) => ({ id: c.id, label: c.title }))}
        bundles={bundles.map((b) => ({ id: b.id, label: b.name }))}
        users={users}
        branding={branding}
      />
    </div>
  );
}
